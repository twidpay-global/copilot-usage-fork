"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setJobSummaryTimeZone = exports.createJobSummarySeatAssignments = exports.createJobSummaryCopilotDetails = exports.createJobSummaryUsage = exports.sumNestedValue = void 0;
const core_1 = require("@actions/core");
const mermaid_1 = require("./mermaid");
const utility_1 = require("./utility");
const getEmptyBaseMetrics = () => ({
    total_engaged_users: 0,
    total_code_acceptances: 0,
    total_code_suggestions: 0,
    total_code_lines_accepted: 0,
    total_code_lines_suggested: 0
});
const sumNestedValue = (data, path) => {
    return data.reduce((sum, obj) => {
        let result = 0;
        // Helper function to recursively traverse the object/array
        const traverse = (current, pathIndex) => {
            // Return if we've reached an invalid path
            if (current === undefined || current === null)
                return;
            if (pathIndex >= path.length) {
                // We've reached the end of the path, add the value if it's a number
                if (typeof current === 'number') {
                    result += current;
                }
                return;
            }
            const key = path[pathIndex];
            if (Array.isArray(current)) {
                // If current is an array, traverse each element
                current.forEach(item => traverse(item, pathIndex));
            }
            else if (typeof current === 'object') {
                // If current has the key, traverse deeper
                if (key in current) {
                    traverse(current[key], pathIndex + 1);
                }
            }
        };
        traverse(obj, 0);
        return sum + result;
    }, 0);
};
exports.sumNestedValue = sumNestedValue;
const aggregateMetricsBy = (data, groupFn) => {
    return data.reduce((acc, day) => {
        const dayMetrics = groupFn(day);
        Object.entries(dayMetrics).forEach(([key, metrics]) => {
            acc[key] = acc[key] || getEmptyBaseMetrics();
            Object.entries(metrics).forEach(([metric, value]) => {
                if (metric === 'total_engaged_users') {
                    acc[key][metric] = Math.max(acc[key][metric], value);
                }
                else {
                    acc[key][metric] += value;
                }
            });
        });
        return acc;
    }, {});
};
const groupLanguageMetrics = (day) => {
    var _a, _b;
    const metrics = {};
    (_b = (_a = day.copilot_ide_code_completions) === null || _a === void 0 ? void 0 : _a.editors) === null || _b === void 0 ? void 0 : _b.forEach(editor => {
        var _a;
        (_a = editor.models) === null || _a === void 0 ? void 0 : _a.forEach(model => {
            var _a;
            (_a = model.languages) === null || _a === void 0 ? void 0 : _a.forEach(lang => {
                const language = lang.name || 'unknown';
                metrics[language] = metrics[language] || getEmptyBaseMetrics();
                Object.entries(lang).forEach(([key, value]) => {
                    if (key in metrics[language] && typeof value === 'number') {
                        metrics[language][key] += value;
                    }
                });
            });
        });
    });
    return metrics;
};
const groupEditorMetrics = (day) => {
    var _a, _b;
    const metrics = {};
    (_b = (_a = day.copilot_ide_code_completions) === null || _a === void 0 ? void 0 : _a.editors) === null || _b === void 0 ? void 0 : _b.forEach(editor => {
        var _a;
        const editorName = editor.name || 'unknown';
        metrics[editorName] = metrics[editorName] || getEmptyBaseMetrics();
        metrics[editorName].total_engaged_users = editor.total_engaged_users || 0;
        (_a = editor.models) === null || _a === void 0 ? void 0 : _a.forEach(model => {
            var _a;
            (_a = model.languages) === null || _a === void 0 ? void 0 : _a.forEach(lang => {
                Object.entries(lang).forEach(([key, value]) => {
                    if (key in metrics[editorName] && typeof value === 'number') {
                        metrics[editorName][key] += value;
                    }
                });
            });
        });
    });
    return metrics;
};
const getChatMetrics = (dailyTotals) => ({
    totalChats: dailyTotals.reduce((sum, day) => sum + (day.total_chats || 0), 0),
    totalCopyEvents: dailyTotals.reduce((sum, day) => sum + (day.total_chat_copy_events || 0), 0),
    totalInsertEvents: dailyTotals.reduce((sum, day) => sum + (day.total_chat_insert_events || 0), 0)
});
const createJobSummaryUsage = (data, name) => {
    const languageMetrics = aggregateMetricsBy(data, groupLanguageMetrics);
    const editorMetrics = aggregateMetricsBy(data, groupEditorMetrics);
    // const modelMetrics = aggregateMetricsBy(data, groupModelMetrics);
    const dailyTotals = data.map(day => ({
        date: day.date,
        total_active_users: day.total_active_users || 0,
        total_engaged_users: day.total_engaged_users || 0,
        total_code_acceptances: (0, exports.sumNestedValue)([day], ['copilot_ide_code_completions', 'editors', 'models', 'languages', 'total_code_acceptances']),
        total_code_suggestions: (0, exports.sumNestedValue)([day], ['copilot_ide_code_completions', 'editors', 'models', 'languages', 'total_code_suggestions']),
        total_code_lines_accepted: (0, exports.sumNestedValue)([day], ['copilot_ide_code_completions', 'editors', 'models', 'languages', 'total_code_lines_accepted']),
        total_code_lines_suggested: (0, exports.sumNestedValue)([day], ['copilot_ide_code_completions', 'editors', 'models', 'languages', 'total_code_lines_suggested']),
        total_chats: (0, exports.sumNestedValue)([day], ['copilot_ide_chat', 'editors', 'models', 'total_chats']),
        total_chat_copy_events: (0, exports.sumNestedValue)([day], ['copilot_ide_chat', 'editors', 'models', 'total_chat_copy_events']),
        total_chat_insert_events: (0, exports.sumNestedValue)([day], ['copilot_ide_chat', 'editors', 'models', 'total_chat_insertion_events']),
        total_dotcom_chat_chats: (0, exports.sumNestedValue)([day], ['copilot_dotcom_chat', 'models', 'total_chats']),
        total_dotcom_pr_summaries_created: (0, exports.sumNestedValue)([day], ['copilot_dotcom_pull_requests', 'repositories', 'models', 'total_pr_summaries_created']),
    }));
    const chatMetrics = getChatMetrics(dailyTotals);
    const topLanguages = Object.entries(languageMetrics)
        .sort((a, b) => b[1].total_code_suggestions - a[1].total_code_suggestions)
        .slice(0, 5)
        .map(([lang]) => lang);
    const totalMetrics = Object.values(languageMetrics).reduce((acc, curr) => ({
        totalCodeAcceptances: acc.totalCodeAcceptances + curr.total_code_acceptances,
        totalCodeSuggestions: acc.totalCodeSuggestions + curr.total_code_suggestions,
        totalLinesAccepted: acc.totalLinesAccepted + curr.total_code_lines_accepted,
        totalLinesSuggestions: acc.totalLinesSuggestions + curr.total_code_lines_suggested
    }), { totalCodeAcceptances: 0, totalCodeSuggestions: 0, totalLinesAccepted: 0, totalLinesSuggestions: 0 });
    return core_1.summary
        .addHeading(`Copilot Usage for ${name}<br>${(0, utility_1.dateFormat)(data[0].date)} - ${(0, utility_1.dateFormat)(data[data.length - 1].date)}`)
        .addRaw(`Metrics for the last ${data.length} days`)
        .addHeading('Totals', 2)
        .addTable([
        ['Code Suggestions', totalMetrics.totalCodeSuggestions.toLocaleString()],
        ['Code Acceptances', totalMetrics.totalCodeAcceptances.toLocaleString()],
        ['Code Acceptance Rate', `${((totalMetrics.totalCodeAcceptances / totalMetrics.totalCodeSuggestions) * 100).toFixed(2)}%`],
        ['Lines of Code Accepted', totalMetrics.totalLinesAccepted.toLocaleString()],
        ['Lines of Code Suggested', totalMetrics.totalLinesSuggestions.toLocaleString()],
        ['Lines Acceptance Rate', `${((totalMetrics.totalLinesAccepted / totalMetrics.totalLinesSuggestions) * 100).toFixed(2)}%`],
        ['Chat Interactions', chatMetrics.totalChats.toLocaleString()],
        ['Chat Copy Events', chatMetrics.totalCopyEvents.toLocaleString()],
        ['Chat Insertion Events', chatMetrics.totalInsertEvents.toLocaleString()]
    ])
        .addHeading('Daily Engaged Users', 3)
        .addRaw((0, mermaid_1.createXYChart)({
        xAxis: {
            categories: mermaid_1.DEFAULT_CHART_CONFIGS.dailyCategories(data)
        },
        yAxis: {},
        series: [
            {
                type: 'bar',
                values: data.map(day => day.total_active_users || 0)
            },
            {
                type: 'bar',
                values: data.map(day => day.total_engaged_users || 0)
            },
        ],
        legend: ['Active', 'Engaged']
    }))
        .addHeading('Daily Engaged Users by Product', 3)
        .addRaw((0, mermaid_1.createXYChart)({
        xAxis: {
            categories: mermaid_1.DEFAULT_CHART_CONFIGS.dailyCategories(data)
        },
        yAxis: {},
        series: [
            {
                type: 'line',
                values: data.map(day => (0, exports.sumNestedValue)([day], ['copilot_ide_code_completions', 'total_engaged_users']))
            },
            {
                type: 'line',
                values: data.map(day => (0, exports.sumNestedValue)([day], ['copilot_ide_chat', 'total_engaged_users']))
            },
            {
                type: 'line',
                values: data.map(day => (0, exports.sumNestedValue)([day], ['copilot_dotcom_chat', 'total_engaged_users']))
            },
            {
                type: 'line',
                values: data.map(day => (0, exports.sumNestedValue)([day], ['copilot_dotcom_pull_requests', 'total_engaged_users']))
            }
        ],
        legend: ['IDE Code Completions', 'IDE Chat', 'Dotcom Chat', 'Dotcom Pull Requests']
    }))
        .addHeading('IDE Completion', 2)
        .addHeading('Suggestions vs. Acceptances', 3)
        .addRaw((0, mermaid_1.createXYChart)({
        xAxis: { categories: mermaid_1.DEFAULT_CHART_CONFIGS.dailyCategories(data) },
        yAxis: {},
        series: [
            {
                type: 'bar',
                values: dailyTotals.map(day => day.total_code_suggestions || 0)
            },
            {
                type: 'bar',
                values: dailyTotals.map(day => day.total_code_acceptances || 0)
            },
        ],
        legend: ['Suggestions', 'Acceptances']
    }))
        .addHeading('Lines Suggested vs. Accepted', 3)
        .addRaw((0, mermaid_1.createXYChart)({
        xAxis: { categories: mermaid_1.DEFAULT_CHART_CONFIGS.dailyCategories(data) },
        yAxis: {},
        series: [
            {
                type: 'bar',
                values: dailyTotals.map(day => day.total_code_lines_suggested || 0)
            },
            {
                type: 'bar',
                values: dailyTotals.map(day => day.total_code_lines_accepted || 0)
            },
        ],
        legend: ['Lines Suggested', 'Lines Accepted']
    }))
        .addHeading('Acceptance Rate', 3)
        .addRaw((0, mermaid_1.createXYChart)({
        xAxis: {
            categories: mermaid_1.DEFAULT_CHART_CONFIGS.dailyCategories(data)
        },
        yAxis: {
            min: 0,
            max: 100
        },
        series: [
            {
                type: 'line',
                values: data.map(day => {
                    const acceptances = (0, exports.sumNestedValue)([day], ['copilot_ide_code_completions', 'editors', 'models', 'languages', 'total_code_acceptances']);
                    const suggestions = (0, exports.sumNestedValue)([day], ['copilot_ide_code_completions', 'editors', 'models', 'languages', 'total_code_suggestions']);
                    return suggestions > 0 ? Math.round((acceptances / suggestions) * 100) : 0;
                })
            }
        ]
    }))
        .addHeading('Acceptance Rate by Language', 3)
        .addRaw((0, mermaid_1.createXYChart)({
        xAxis: {
            categories: mermaid_1.DEFAULT_CHART_CONFIGS.dailyCategories(data)
        },
        yAxis: {
            min: 0,
            max: 100
        },
        series: topLanguages.map(language => ({
            type: 'line',
            values: data.map(day => {
                var _a, _b;
                let acceptances = 0;
                let suggestions = 0;
                (_b = (_a = day.copilot_ide_code_completions) === null || _a === void 0 ? void 0 : _a.editors) === null || _b === void 0 ? void 0 : _b.forEach(editor => {
                    var _a;
                    (_a = editor.models) === null || _a === void 0 ? void 0 : _a.forEach(model => {
                        var _a;
                        (_a = model.languages) === null || _a === void 0 ? void 0 : _a.forEach(lang => {
                            if (lang.name === language) {
                                acceptances += lang.total_code_acceptances || 0;
                                suggestions += lang.total_code_suggestions || 0;
                            }
                        });
                    });
                });
                return suggestions > 0 ? Math.round((acceptances / suggestions) * 100) : 0;
            })
        })),
        legend: topLanguages
    }))
        .addHeading('Language Usage by Engaged Users', 3)
        .addRaw((0, mermaid_1.createPieChart)(Object.fromEntries(Object.entries(languageMetrics)
        .map(([lang, metrics]) => [lang, metrics.total_engaged_users]))))
        .addHeading('Editor Usage by Engaged Users', 3)
        .addRaw((0, mermaid_1.createPieChart)(Object.fromEntries(Object.entries(editorMetrics)
        .map(([editor, metrics]) => [editor, metrics.total_engaged_users]))))
        // .addHeading('Model Usage')
        // .addRaw(createPieChart(Object.fromEntries(Object.entries(modelMetrics)
        //     .map(([model, metrics]) => [model, metrics.total_engaged_users]))
        // ))
        .addHeading('IDE Copilot Chat', 2)
        .addRaw((0, mermaid_1.createXYChart)({
        xAxis: {
            categories: mermaid_1.DEFAULT_CHART_CONFIGS.dailyCategories(data)
        },
        yAxis: {},
        series: [
            {
                type: 'bar',
                values: dailyTotals.map(day => day.total_chats || 0)
            },
            {
                type: 'line',
                values: dailyTotals.map(day => day.total_chat_copy_events || 0)
            },
            {
                type: 'line',
                values: dailyTotals.map(day => day.total_chat_insert_events || 0)
            },
        ],
        legend: ['Total Chats', 'Copy Events', 'Insert Events']
    }))
        .addHeading('Copilot .COM Chat', 2)
        .addHeading('Total Chats', 3)
        .addRaw((0, mermaid_1.createXYChart)({
        xAxis: {
            categories: mermaid_1.DEFAULT_CHART_CONFIGS.dailyCategories(data)
        },
        yAxis: {},
        series: [
            {
                type: 'bar',
                values: dailyTotals.map(day => day.total_dotcom_chat_chats || 0)
            }
        ],
        legend: ['Total Chats']
    }))
        .addHeading('Copilot .COM Pull Request', 2)
        .addHeading('Summaries Created', 3)
        .addRaw((0, mermaid_1.createXYChart)({
        xAxis: {
            categories: mermaid_1.DEFAULT_CHART_CONFIGS.dailyCategories(data)
        },
        yAxis: {},
        series: [
            {
                type: 'bar',
                values: dailyTotals.map(day => day.total_dotcom_pr_summaries_created || 0)
            }
        ],
        legend: ['Total PR Summaries Created']
    }));
};
exports.createJobSummaryUsage = createJobSummaryUsage;
const createJobSummaryCopilotDetails = (orgCopilotDetails) => {
    var _a, _b, _c, _d;
    return core_1.summary
        .addHeading('Seat Info')
        .addHeading('Organization Copilot Details', 3)
        .addTable([
        ['Plan Type', ((_a = orgCopilotDetails.plan_type) === null || _a === void 0 ? void 0 : _a.toLocaleUpperCase()) || 'Unknown'],
        ['Seat Management Setting', {
                'assign_all': 'Assign All',
                'assign_selected': 'Assign Selected',
                'disabled': 'Disabled',
                'unconfigured': 'Unconfigured',
            }[orgCopilotDetails.seat_management_setting] || 'Unknown'],
    ])
        .addHeading('Seat Breakdown', 3)
        .addTable([
        ['Total Seats', (orgCopilotDetails.seat_breakdown.total || 0).toString()],
        ['Added this cycle', (orgCopilotDetails.seat_breakdown.added_this_cycle || 0).toString()],
        ['Pending invites', (orgCopilotDetails.seat_breakdown.pending_invitation || 0).toString()],
        ['Pending cancellations', (orgCopilotDetails.seat_breakdown.pending_cancellation || 0).toString()],
        ['Active this cycle', (orgCopilotDetails.seat_breakdown.active_this_cycle || 0).toString()],
        ['Inactive this cycle', (orgCopilotDetails.seat_breakdown.inactive_this_cycle || 0).toString()]
    ])
        .addHeading('Policies', 3)
        .addTable([
        ['Public Code Suggestions Enabled', {
                'allow': 'Allowed',
                'block': 'Blocked',
                'unconfigured': 'Unconfigured',
            }[orgCopilotDetails.public_code_suggestions] || 'Unknown'],
        ['IDE Chat Enabled', ((_b = orgCopilotDetails.ide_chat) === null || _b === void 0 ? void 0 : _b.toLocaleUpperCase()) || 'Unknown'],
        ['Platform Chat Enabled', ((_c = orgCopilotDetails.platform_chat) === null || _c === void 0 ? void 0 : _c.toLocaleUpperCase()) || 'Unknown'],
        ['CLI Enabled', ((_d = orgCopilotDetails.cli) === null || _d === void 0 ? void 0 : _d.toLocaleUpperCase()) || 'Unknown'],
    ]);
};
exports.createJobSummaryCopilotDetails = createJobSummaryCopilotDetails;
const createJobSummarySeatAssignments = (data) => {
    if (!data)
        data = [];
    return core_1.summary
        .addHeading('Seat Assignments')
        .addTable([
        [
            { data: 'Avatar', header: true },
            { data: 'Login', header: true },
            { data: `Last Activity (${process.env.TZ || 'UTC'})`, header: true },
            { data: 'Last Editor Used', header: true },
            { data: 'Created At', header: true },
            { data: 'Pending Cancellation Date', header: true },
            { data: 'Team', header: true },
        ],
        ...data.map(seat => {
            var _a, _b, _c;
            return [
                `<img src="${(_a = seat.assignee) === null || _a === void 0 ? void 0 : _a.avatar_url}" width="33" />`,
                (_b = seat.assignee) === null || _b === void 0 ? void 0 : _b.login,
                seat.last_activity_at ? (0, utility_1.dateFormat)(seat.last_activity_at, { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' }) : 'No Activity',
                seat.last_activity_editor || 'N/A',
                (0, utility_1.dateFormat)(seat.created_at),
                (0, utility_1.dateFormat)(seat.pending_cancellation_date || ''),
                String(((_c = seat.assigning_team) === null || _c === void 0 ? void 0 : _c.name) || ' '),
            ];
        })
    ]);
};
exports.createJobSummarySeatAssignments = createJobSummarySeatAssignments;
const setJobSummaryTimeZone = (timeZone) => process.env.TZ = timeZone;
exports.setJobSummaryTimeZone = setJobSummaryTimeZone;
