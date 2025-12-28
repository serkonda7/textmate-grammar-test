import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as p from 'node:path'
import { XMLParser } from 'fast-xml-parser'
import { type Reporter, XunitGenericReporter, XunitGitlabReporter } from '../../src/cli/reporter.ts'
import type { FileMetadata, TestedLine, TestFailure } from '../../src/unit/types.ts'

const sep = p.sep

const xmlParser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '',
	textNodeName: '_',
	attributesGroupName: '$',
	parseAttributeValue: false,
	parseTagValue: false,
	preserveOrder: false,
	trimValues: false,
	isArray: (tagName, _jPath, _isLeafNode, _isAttribute) =>
		['testcase', 'failure', 'error'].includes(tagName),
})

// TODO refactor this whole file.
//   goal: not construct every test case and expected value but rely more closely on the library functions
describe('XUnit reporters', () => {
	let reportsDir: string

	beforeEach(() => {
		reportsDir = fs.mkdtempSync(`${os.tmpdir}${sep}reports_`)
	})

	afterEach(() => {
		fs.rmSync(reportsDir, { recursive: true })
	})

	describe('Generic XUnit reporter', () => {
		let reporter: Reporter

		beforeEach(() => {
			reporter = new XunitGenericReporter(reportsDir)
		})

		it('should emit one report file per test file', async () => {
			reporter.reportTestResult(
				'file1',
				{
					metadata: metadata('case 1 description'),
					test_lines: [lineAssertion('source1', 1), lineAssertion('source1', 2)],
				},
				[],
			)
			reporter.reportTestResult(
				'file2',
				{
					metadata: metadata(),
					test_lines: [lineAssertion('source2', 3)],
				},
				[],
			)
			reporter.reportSuiteResult()

			assertReportFiles('TEST-file1.xml', 'TEST-file2.xml')

			const xml1 = readReport('TEST-file1.xml')
			expect(xml1.testsuite.$.name).toEqual('case 1 description')
			expect(xml1.testsuite.$.tests).toEqual('2')
			expect(xml1.testsuite.$.failures).toEqual('0')
			expect(xml1.testsuite.testcase).toHaveLength(2)
			expect(xml1.testsuite.testcase[0].$.name).toEqual('file1:1')
			expect(xml1.testsuite.testcase[1].$.name).toEqual('file1:2')

			const xml2 = readReport('TEST-file2.xml')
			expect(xml2.testsuite.$.name).toEqual('file2')
			expect(xml2.testsuite.$.tests).toEqual('1')
			expect(xml2.testsuite.$.failures).toEqual('0')
			expect(xml2.testsuite.testcase).toHaveLength(1)
			expect(xml2.testsuite.testcase[0].$.name).toEqual('file2:3')
		})

		it('should place reports for test files in nested directories directly into reports directory with mangled names', async () => {
			reporter.reportTestResult(
				'file1',
				{
					metadata: metadata(),
					test_lines: [lineAssertion('source1', 1)],
				},
				[],
			)
			reporter.reportTestResult(
				`dir1${sep}file2`,
				{
					metadata: metadata('case 2 description'),
					test_lines: [lineAssertion('source2', 2)],
				},
				[],
			)
			reporter.reportTestResult(
				`dir1${sep}dir2${sep}file3`,
				{
					metadata: metadata(),
					test_lines: [lineAssertion('source3', 3)],
				},
				[],
			)
			reporter.reportSuiteResult()

			assertReportFiles('TEST-file1.xml', 'TEST-dir1.file2.xml', 'TEST-dir1.dir2.file3.xml')

			const xml1 = readReport('TEST-file1.xml')
			expect(xml1.testsuite.$.name).toEqual('file1')
			expect(xml1.testsuite.testcase[0].$.name).toEqual('file1:1')

			const xml2 = readReport('TEST-dir1.file2.xml')
			expect(xml2.testsuite.$.name).toEqual('case 2 description')
			expect(xml2.testsuite.testcase[0].$.name).toEqual(`dir1${sep}file2:2`)

			const xml3 = readReport('TEST-dir1.dir2.file3.xml')
			expect(xml3.testsuite.$.name).toEqual(`dir1${sep}dir2${sep}file3`)
			expect(xml3.testsuite.testcase[0].$.name).toEqual(`dir1${sep}dir2${sep}file3:3`)
		})

		it('should escape reserved characters in failure description', async () => {
			reporter.reportTestResult(
				'file',
				{
					metadata: metadata(),
					test_lines: [lineAssertion('xml hell " \' < > &', 1)],
				},
				[assertionFailure('xml hell " \' < > &', 1, 0, 1, [], ['m1'], [])],
			)
			reporter.reportSuiteResult()

			const xml = readReport('TEST-file.xml')
			expect(xml.testsuite.testcase[0].failure[0]._).toEqual(
				[
					'1: xml hell " \' < > &', // the escapes were converted back to regular chars by the xml lib when parsing
					'   ^',
					'missing required scopes: m1',
					'actual: ',
				].join('\n'),
			)
		})

		it('should associate assertion failures with source lines', async () => {
			reporter.reportTestResult(
				'file',
				{
					metadata: metadata(),
					test_lines: [
						lineAssertion('1  source1', 1),
						lineAssertion('4  source2', 4),
						lineAssertion('6  source3', 6),
						lineAssertion('9  source4', 9),
					],
				},
				[
					assertionFailure('1  source1', 1, 0, 1, ['a1', 'a2', 'a3'], ['m1', 'm2'], ['u1']),
					assertionFailure('6  source3', 6, 0, 3, ['a1', 'a2'], ['m1'], []),
					assertionFailure('6  source3', 6, 3, 5, ['a1'], [], ['u1']),
				],
			)
			reporter.reportSuiteResult()

			assertReportFiles('TEST-file.xml')

			const xml = readReport('TEST-file.xml')
			expect(xml.testsuite.$.tests).toEqual('4')
			expect(xml.testsuite.$.failures).toEqual('3')
			expect(xml.testsuite.testcase).toHaveLength(4)

			const [xmlCase1, xmlCase2, xmlCase3, xmlCase4] = xml.testsuite.testcase

			expect(xmlCase1.$.name).toEqual('file:1')
			expect(xmlCase1.failure).toHaveLength(1)
			const [xmlFailure11] = xmlCase1.failure
			expect(xmlFailure11.$.message).toEqual('Assertion failed at 1:1:2')
			expect(xmlFailure11._).toEqual(
				[
					'1: 1  source1',
					'   ^',
					'missing required scopes: m1 m2',
					'prohibited scopes: u1',
					'actual: a1 a2 a3',
				].join('\n'),
			)

			expect(xmlCase2.$.name).toEqual('file:4')
			expect(xmlCase2.failure).toBeUndefined

			expect(xmlCase3.$.name).toEqual('file:6')
			expect(xmlCase3.failure).toHaveLength(2)
			const [xmlFailure31, xmlFailure32] = xmlCase3.failure
			expect(xmlFailure31.$.message).toEqual('Assertion failed at 6:1:4')
			expect(xmlFailure31._).toEqual(
				['6: 6  source3', '   ^^^', 'missing required scopes: m1', 'actual: a1 a2'].join('\n'),
			)
			expect(xmlFailure32.$.message).toEqual('Assertion failed at 6:4:6')
			expect(xmlFailure32._).toEqual(
				['6: 6  source3', '      ^^', 'prohibited scopes: u1', 'actual: a1'].join('\n'),
			)

			expect(xmlCase4.$.name).toEqual('file:9')
			// eslint-disable-next-line @typescript-eslint/no-unused-expressions
			expect(xmlCase4.failure).toBeUndefined
		})

		it('should create report for test file which fails to parse', async () => {
			reporter.reportTestResult(
				'file1',
				{
					metadata: metadata(),
					test_lines: [lineAssertion('source1', 1)],
				},
				[],
			)
			reporter.reportParseError(
				'file2',
				new Error(
					'First line must contain header:\n' +
						'<comment token> SYNTAX TEST "<scopeName>" "description"\n',
				),
			)
			reporter.reportTestResult(
				'file3',
				{
					metadata: metadata(),
					test_lines: [lineAssertion('source3', 3)],
				},
				[],
			)
			reporter.reportSuiteResult()

			assertReportFiles('TEST-file1.xml', 'TEST-file2.xml', 'TEST-file3.xml')

			const xml = readReport('TEST-file2.xml')
			expect(xml.testsuite.$.tests).toEqual('1')
			expect(xml.testsuite.$.failures).toEqual('0')
			expect(xml.testsuite.$.errors).toEqual('1')
			expect(xml.testsuite.testcase).toHaveLength(1)

			const xmlCase = xml.testsuite.testcase[0]
			expect(xmlCase.$.name).toEqual('Parse test file')
			expect(xmlCase.failure).toBeUndefined()
			expect(xmlCase.error).toHaveLength(1)
			expect(xmlCase.error[0].$.message).toEqual('Failed to parse test file')
			expect(xmlCase.error[0]._).toSatisfy((m: string) =>
				m.startsWith(
					[
						'Error: First line must contain header:',
						'<comment token> SYNTAX TEST "<scopeName>" "description"',
					].join('\n'),
				),
			)
		})

		it('should create report for test file which errors when running grammar test', async () => {
			reporter.reportTestResult(
				'file1',
				{
					metadata: metadata(),
					test_lines: [lineAssertion('source1', 1)],
				},
				[],
			)
			reporter.reportGrammarTestError(
				'file2',
				{
					metadata: metadata(),
					test_lines: [lineAssertion('source1', 2)],
				},
				new Error('No grammar provided for <foobar>'),
			)
			reporter.reportTestResult(
				'file3',
				{
					metadata: metadata(),
					test_lines: [lineAssertion('source3', 3)],
				},
				[],
			)
			reporter.reportSuiteResult()

			assertReportFiles('TEST-file1.xml', 'TEST-file2.xml', 'TEST-file3.xml')

			const xml = readReport('TEST-file2.xml')
			expect(xml.testsuite.$.tests).toEqual('1')
			expect(xml.testsuite.$.failures).toEqual('0')
			expect(xml.testsuite.$.errors).toEqual('1')
			expect(xml.testsuite.testcase).toHaveLength(1)

			const xmlCase = xml.testsuite.testcase[0]
			expect(xmlCase.$.name).toEqual('Run grammar tests')
			// eslint-disable-next-line @typescript-eslint/no-unused-expressions
			expect(xmlCase.failure).toBeUndefined()
			expect(xmlCase.error).toHaveLength(1)
			expect(xmlCase.error[0].$.message).toEqual('Error when running grammar tests')
			expect(xmlCase.error[0]._).toSatisfy((m: string) =>
				m.startsWith(['Error: No grammar provided for <foobar>'].join('\n')),
			)
		})
	})

	describe('GitLab-flavored XUnit reporter', () => {
		let reporter: Reporter

		beforeEach(() => {
			reporter = new XunitGitlabReporter(reportsDir)
		})

		it('should always put filename into classname', async () => {
			reporter.reportTestResult(
				'file1',
				{
					metadata: metadata(),
					test_lines: [lineAssertion('source1', 1)],
				},
				[],
			)
			reporter.reportGrammarTestError(
				'file2',
				{
					metadata: metadata(),
					test_lines: [lineAssertion('source1', 2)],
				},
				new Error('No grammar provided for <foobar>'),
			)
			reporter.reportParseError(
				'file3',
				new Error(
					'First line must contain header:\n' +
						'<comment token> SYNTAX TEST "<scopeName>" "description"\n',
				),
			)
			reporter.reportSuiteResult()

			const xml1 = readReport('TEST-file1.xml')
			expect(xml1.testsuite.testcase[0].$.classname).toEqual('file1')

			const xml2 = readReport('TEST-file2.xml')
			expect(xml2.testsuite.testcase[0].$.classname).toEqual('file2')

			const xml3 = readReport('TEST-file3.xml')
			expect(xml3.testsuite.testcase[0].$.classname).toEqual('file3')
		})

		it('should put all failed assertions for one source line into single failure', async () => {
			reporter.reportTestResult(
				'file',
				{
					metadata: metadata(),
					test_lines: [
						lineAssertion('1  source1', 1),
						lineAssertion('4  source2', 4),
						lineAssertion('6  source3', 6),
						lineAssertion('9  source4', 9),
					],
				},
				[
					assertionFailure('1  source1', 1, 0, 1, ['a1', 'a2', 'a3'], ['m1', 'm2'], ['u1']),
					assertionFailure('6  source3', 6, 0, 3, ['a1', 'a2'], ['m1'], []),
					assertionFailure('6  source3', 6, 3, 5, ['a1'], [], ['u1']),
				],
			)
			reporter.reportSuiteResult()

			assertReportFiles('TEST-file.xml')

			const xml = readReport('TEST-file.xml')
			expect(xml.testsuite.$.tests).toEqual('4')
			expect(xml.testsuite.$.failures).toEqual('2')
			expect(xml.testsuite.testcase).toHaveLength(4)

			const [xmlCase1, xmlCase2, xmlCase3, xmlCase4] = xml.testsuite.testcase

			expect(xmlCase1.$.name).toEqual('file:1')
			expect(xmlCase1.failure).toHaveLength(1)
			const [xmlFailure1] = xmlCase1.failure
			expect(xmlFailure1.$.message).toEqual('Failed at soure line 1')
			expect(xmlFailure1._).toEqual(
				[
					'at [file:1:1:2]:',
					'1: 1  source1',
					'   ^',
					'missing required scopes: m1 m2',
					'prohibited scopes: u1',
					'actual: a1 a2 a3',
					'',
				].join('\n'),
			)

			expect(xmlCase2.$.name).toEqual('file:4')
			// eslint-disable-next-line @typescript-eslint/no-unused-expressions
			expect(xmlCase2.failure).toBeUndefined()

			expect(xmlCase3.$.name).toEqual('file:6')
			expect(xmlCase3.failure).toHaveLength(1)
			const [xmlFailure3] = xmlCase3.failure
			expect(xmlFailure3.$.message).toEqual('Failed at soure line 6')
			expect(xmlFailure3._).toEqual(
				[
					'at [file:6:1:4]:',
					'6: 6  source3',
					'   ^^^',
					'missing required scopes: m1',
					'actual: a1 a2',
					'',
					'at [file:6:4:6]:',
					'6: 6  source3',
					'      ^^',
					'prohibited scopes: u1',
					'actual: a1',
					'',
				].join('\n'),
			)

			expect(xmlCase4.$.name).toEqual('file:9')
			// eslint-disable-next-line @typescript-eslint/no-unused-expressions
			expect(xmlCase4.failure).toBeUndefined()
		})
	})

	const assertReportFiles: (...expected: string[]) => void = (...expected: string[]) => {
		const reportFiles = fs.readdirSync(reportsDir)
		expect(reportFiles).toEqual(expect.arrayContaining(expected))
		expect(reportFiles).toHaveLength(expected.length)
	}

	const readReport = (filename: string) => {
		const fpath = p.resolve(reportsDir, filename)
		const xmlContent = fs.readFileSync(fpath, 'utf-8')
		return xmlParser.parse(xmlContent)
	}
})

function metadata(description?: string): FileMetadata {
	return {
		scope: 'main.scope',
		comment_token: '//',
		description: description || '',
	}
}

function lineAssertion(source_line: string, testCaseLineNumber: number): TestedLine {
	return {
		src: source_line,
		line_nr: testCaseLineNumber,
		scope_asserts: [
			{
				from: -1,
				to: -2,
				scopes: ['scope1'],
				excludes: [],
			},
		],
	}
}

function assertionFailure(
	sourceLineText: string,
	testCaseLineNumber: number,
	start: number,
	end: number,
	actual: string[],
	missing: string[],
	unexpected: string[],
): TestFailure {
	return {
		actual,
		missing,
		unexpected,
		srcLineText: sourceLineText,
		line: testCaseLineNumber - 1,
		start,
		end,
	}
}
