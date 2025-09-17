"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ override: true });
const job_summary_1 = require("../src/job-summary");
const job_summary_2 = require("../src/job-summary"); // Import sumNestedValue function
const summary_1 = require("@actions/core/lib/summary");
const fs_1 = require("fs");
const getSummaryBuffer = (_summary) => {
    return _summary._buffer;
};
(0, vitest_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    // await createMockData();
}));
(0, vitest_1.beforeEach)(() => {
    summary_1.summary.emptyBuffer();
});
const sample = (0, fs_1.readFileSync)('./__tests__/mock/sample.json', 'utf-8');
const exampleResponseEnterprise = JSON.parse(sample);
const sampleCopilotDetails = (0, fs_1.readFileSync)('./__tests__/mock/sample-copilot-details.json', 'utf-8');
const exampleResponseCopilotDetails = JSON.parse(sampleCopilotDetails);
const sampleCopilotSeats = (0, fs_1.readFileSync)('./__tests__/mock/sample-copilot-seats.json', 'utf-8');
const exampleResponseCopilotSeats = JSON.parse(sampleCopilotSeats);
(0, vitest_1.test)('createJobSummaryUsage(enterpriseUsage)', () => __awaiter(void 0, void 0, void 0, function* () {
    const summary = yield (0, job_summary_1.createJobSummaryUsage)(exampleResponseEnterprise, 'enterprise');
    (0, fs_1.writeFileSync)('./__tests__/mock/sample-output.md', summary.stringify());
    (0, vitest_1.expect)(summary).toBeDefined();
}));
(0, vitest_1.test)('createJobSummaryCopilotDetails(enterpriseUsage)', () => __awaiter(void 0, void 0, void 0, function* () {
    const summary = yield (0, job_summary_1.createJobSummaryCopilotDetails)(exampleResponseCopilotDetails);
    (0, fs_1.writeFileSync)('./__tests__/mock/sample-copilot-details-output.md', summary.stringify());
    (0, vitest_1.expect)(summary).toBeDefined();
}));
(0, vitest_1.test)('createJobSummaryCopilotSeats(enterpriseUsage)', () => __awaiter(void 0, void 0, void 0, function* () {
    const summary = yield (0, job_summary_1.createJobSummarySeatAssignments)(exampleResponseCopilotSeats.seats);
    (0, fs_1.writeFileSync)('./__tests__/mock/sample-copilot-seats-output.md', summary.stringify());
    (0, vitest_1.expect)(summary).toBeDefined();
}));
// Tests for sumNestedValue function
(0, vitest_1.test)('sumNestedValue with simple objects', () => {
    const data = [
        { a: { b: 10 } },
        { a: { b: 20 } },
        { a: { b: 30 } }
    ];
    (0, vitest_1.expect)((0, job_summary_2.sumNestedValue)(data, ['a', 'b'])).toBe(60);
});
(0, vitest_1.test)('sumNestedValue with missing paths', () => {
    const data = [
        { a: { b: 10 } },
        { a: { c: 20 } }, // Missing 'b' key
        { a: { b: 30 } }
    ];
    (0, vitest_1.expect)((0, job_summary_2.sumNestedValue)(data, ['a', 'b'])).toBe(40); // Should skip the object with missing path
});
(0, vitest_1.test)('sumNestedValue with deeply nested objects', () => {
    const data = [
        { level1: { level2: { level3: 100 } } },
        { level1: { level2: { level3: 200 } } }
    ];
    (0, vitest_1.expect)((0, job_summary_2.sumNestedValue)(data, ['level1', 'level2', 'level3'])).toBe(300);
});
(0, vitest_1.test)('sumNestedValue with non-numeric values', () => {
    const data = [
        { a: { b: 10 } },
        { a: { b: "20" } }, // String value instead of number
        { a: { b: 30 } }
    ];
    (0, vitest_1.expect)((0, job_summary_2.sumNestedValue)(data, ['a', 'b'])).toBe(40); // Should only sum numeric values
});
(0, vitest_1.test)('sumNestedValue with empty data array', () => {
    (0, vitest_1.expect)((0, job_summary_2.sumNestedValue)([], ['a', 'b'])).toBe(0); // Should return 0 for empty array
});
(0, vitest_1.test)('sumNestedValue with completely missing path', () => {
    const data = [
        { x: { y: 10 } },
        { x: { y: 20 } }
    ];
    (0, vitest_1.expect)((0, job_summary_2.sumNestedValue)(data, ['a', 'b'])).toBe(0); // Path doesn't exist at all
});
// New test for array traversal
(0, vitest_1.test)('sumNestedValue with array traversal', () => {
    const data = [
        {
            a: {
                items: [
                    { value: 5 },
                    { value: 10 }
                ]
            }
        },
        {
            a: {
                items: [
                    { value: 15 },
                    { value: 20 }
                ]
            }
        }
    ];
    (0, vitest_1.expect)((0, job_summary_2.sumNestedValue)(data, ['a', 'items', 'value'])).toBe(50); // Should sum all values in the arrays
});
(0, vitest_1.test)('sumNestedValue with exampleResponseEnterprise data', () => {
    // Test with real data paths
    const totalChatEngagedUsers = (0, job_summary_2.sumNestedValue)(exampleResponseEnterprise, ['copilot_ide_chat', 'total_engaged_users']);
    (0, vitest_1.expect)(totalChatEngagedUsers).toBeGreaterThan(0);
    // Calculate total active users across all days
    const totalActiveUsers = (0, job_summary_2.sumNestedValue)(exampleResponseEnterprise, ['total_active_users']);
    (0, vitest_1.expect)(totalActiveUsers).toBeGreaterThan(0);
    // Test with a more specific path - this needed to be adjusted to match the actual data structure
    const totalEngagedUsers = (0, job_summary_2.sumNestedValue)(exampleResponseEnterprise, ['total_engaged_users']);
    (0, vitest_1.expect)(totalEngagedUsers).toBeGreaterThan(0);
    // Test a path that should return 0 (non-existent path)
    const nonExistentPath = (0, job_summary_2.sumNestedValue)(exampleResponseEnterprise, ['non', 'existent', 'path']);
    (0, vitest_1.expect)(nonExistentPath).toBe(0);
});
