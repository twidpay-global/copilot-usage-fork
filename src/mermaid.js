"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CHART_CONFIGS = exports.createXYChart = exports.createPieChart = exports.createMermaidChart = void 0;
exports.generateLegend = generateLegend;
const utility_1 = require("./utility");
const createMermaidChart = (type, config, content) => {
    const chartConfig = `---
config:
    ${type === 'xychart-beta' ? `xyChart:
        width: ${config.width || 900}
        height: ${config.height || 500}
        xAxis:
            labelPadding: 20
        yAxis:
            labelPadding: 20
    themeVariables:
        xyChart:
            backgroundColor: "transparent"` : ''}
---
${type}
${config.title ? `  title "${config.title}"` : ''}
${content}`;
    return `\n\`\`\`mermaid\n${chartConfig}\n\`\`\`\n`;
};
exports.createMermaidChart = createMermaidChart;
const createPieChart = (data, limit = 20) => {
    const content = Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([label, value]) => `"${label}" : ${value}`)
        .join('\n');
    return (0, exports.createMermaidChart)('pie', {}, content);
};
exports.createPieChart = createPieChart;
const createXYChart = (config) => {
    const { min, max } = config.series.reduce((acc, series) => {
        series.values.forEach(value => {
            if (value < acc.min || acc.min === undefined)
                acc.min = value;
            if (value > acc.max || acc.max === undefined)
                acc.max = value;
        });
        return acc;
    }, { min: config.yAxis.min || 0, max: config.yAxis.max || 100 });
    return (0, exports.createMermaidChart)('xychart-beta', config, `  x-axis ${config.xAxis.title ? "\"" + config.xAxis.title + "\"" : ''} [${config.xAxis.categories.join(', ')}]\n` +
        `  y-axis ${config.yAxis.title ? "\"" + config.yAxis.title + "\"" : ''} ${min || 0} --> ${max || 100}\n` +
        config.series.map(series => {
            return `${series.type} ${series.category ? "\"" + series.category + "\"" : ''} [${series.values.join(', ')}]`;
        }).join('\n')) + (config.legend ? `\n${generateLegend(config.legend)}` : '');
};
exports.createXYChart = createXYChart;
function generateLegend(categories) {
    const colors = ["#3498db", "#2ecc71", "#e74c3c", "#f1c40f", "#bdc3c7", "#ffffff", "#34495e", "#9b59b6", "#1abc9c", "#e67e22"];
    return categories.map((category, i) => `![](https://placehold.co/11x11/${colors[i % colors.length].replace('#', '')}/${colors[i % colors.length]
        .replace('#', '')}.png) ${category}`)
        .join('&nbsp;&nbsp;');
}
const DEFAULT_CHART_HEIGHT = 400;
exports.DEFAULT_CHART_CONFIGS = {
    standardHeight: { height: DEFAULT_CHART_HEIGHT },
    dailyCategories: (data) => data.map(day => (0, utility_1.dateFormat)(day.date, { day: 'numeric' })),
};
