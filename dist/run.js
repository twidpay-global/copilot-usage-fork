"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const rest_1 = require("@octokit/rest");
const artifact_1 = require("@actions/artifact");
const fs_1 = require("fs");
const json_2_csv_1 = require("json-2-csv");
const jstoxml_1 = require("jstoxml");
const job_summary_1 = require("./job-summary");
const getInputs = () => {
    const result = {};
    result.token = (0, core_1.getInput)("github-token").trim();
    result.organization = (0, core_1.getInput)("organization").trim();
    result.team = (0, core_1.getInput)("team").trim();
    result.jobSummary = (0, core_1.getBooleanInput)("job-summary");
    result.days = parseInt((0, core_1.getInput)("days"));
    result.since = (0, core_1.getInput)("since");
    result.until = (0, core_1.getInput)("until");
    result.json = (0, core_1.getBooleanInput)("json");
    result.csv = (0, core_1.getBooleanInput)("csv");
    result.csvOptions = (0, core_1.getInput)("csv-options") ? JSON.parse((0, core_1.getInput)("csv-options")) : undefined;
    result.xml = (0, core_1.getBooleanInput)("xml");
    result.xmlOptions = (0, core_1.getInput)("xml-options") ? JSON.parse((0, core_1.getInput)("xml-options")) : {
        header: true,
        indent: "  ",
    };
    result.timeZone = (0, core_1.getInput)("time-zone");
    result.artifactName = (0, core_1.getInput)("artifact-name");
    if (!result.token) {
        throw new Error("github-token is required");
    }
    return result;
};
const run = async () => {
    const input = getInputs();
    const octokit = new rest_1.Octokit({
        auth: input.token
    });
    const params = {};
    if (input.days) {
        params.since = new Date(new Date().setDate(new Date().getDate() - input.days)).toISOString().split('T')[0];
    }
    else if (input.since || input.until) {
        if (input.since)
            params.since = input.since;
        if (input.until)
            params.until = input.until;
    }
    let req;
    if (input.team) {
        if (!input.organization) {
            throw new Error("organization is required when team is provided");
        }
        (0, core_1.info)(`Fetching Copilot usage for team ${input.team} inside organization ${input.organization}`);
        req = octokit.rest.copilot.copilotMetricsForTeam({
            org: input.organization,
            team_slug: input.team,
            ...params
        }).then(response => response.data);
    }
    else if (input.organization) {
        (0, core_1.info)(`Fetching Copilot usage for organization ${input.organization}`);
        req = octokit.rest.copilot.copilotMetricsForOrganization({
            org: input.organization,
            ...params
        }).then(response => response.data);
    }
    else {
        throw new Error("organization, enterprise or team input is required");
    }
    const data = await req;
    if (!data || data.length === 0) {
        return (0, core_1.warning)("No Copilot usage data found");
    }
    (0, core_1.debug)(JSON.stringify(data, null, 2));
    (0, core_1.info)(`Fetched Copilot usage data for ${data.length} days (${data[0].date} to ${data[data.length - 1].date})`);
    if (input.jobSummary) {
        (0, job_summary_1.setJobSummaryTimeZone)(input.timeZone);
        const name = (input.team && input.organization) ? `${input.organization} / ${input.team}` : input.organization;
        await (0, job_summary_1.createJobSummaryUsage)(data, name).write();
        if (input.organization && !input.team) {
            (0, core_1.info)(`Fetching Copilot details for organization ${input.organization}`);
            const orgCopilotDetails = await octokit.rest.copilot.getCopilotOrganizationDetails({
                org: input.organization
            }).then(response => response.data);
            if (orgCopilotDetails) {
                await (0, job_summary_1.createJobSummaryCopilotDetails)(orgCopilotDetails).write();
            }
            (0, core_1.setOutput)("result-org-details", JSON.stringify(orgCopilotDetails));
            (0, core_1.info)(`Fetching Copilot seat assignments for organization ${input.organization}`);
            const orgSeatAssignments = await octokit.paginate(octokit.rest.copilot.listCopilotSeats, {
                org: input.organization
            });
            const _orgSeatAssignments = {
                total_seats: orgSeatAssignments[0]?.total_seats || 0,
                seats: (orgSeatAssignments).reduce((acc, rsp) => acc.concat(rsp.seats), [])
            };
            if (_orgSeatAssignments.total_seats > 0 && _orgSeatAssignments?.seats) {
                _orgSeatAssignments.seats = _orgSeatAssignments.seats.sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime());
                await (0, job_summary_1.createJobSummarySeatAssignments)(_orgSeatAssignments?.seats)?.write();
            }
            (0, core_1.setOutput)("result-seats", JSON.stringify(_orgSeatAssignments));
        }
        if (input.organization) {
            await core_1.summary.addLink(`Manage Access for ${input.organization}`, `https://github.com/organizations/${input.organization}/settings/copilot/seat_management`)
                .write();
        }
    }
    if (input.csv || input.xml || input.json) {
        const artifact = new artifact_1.DefaultArtifactClient();
        const files = [];
        if (input.json) {
            (0, fs_1.writeFileSync)('copilot-usage.json', JSON.stringify(data, null, 2));
            files.push('copilot-usage.json');
        }
        if (input.csv) {
            (0, fs_1.writeFileSync)('copilot-usage.csv', await (0, json_2_csv_1.json2csv)(data, input.csvOptions));
            files.push('copilot-usage.csv');
        }
        if (input.xml) {
            (0, fs_1.writeFileSync)('copilot-usage.xml', await (0, jstoxml_1.toXML)(data, input.xmlOptions));
            files.push('copilot-usage.xml');
        }
        await artifact.uploadArtifact(input.artifactName, files, '.');
    }
    (0, core_1.setOutput)("result", JSON.stringify(data));
    (0, core_1.setOutput)("since", data[0].date);
    (0, core_1.setOutput)("until", data[data.length - 1].date);
    (0, core_1.setOutput)("days", data.length.toString());
};
exports.default = run;
//# sourceMappingURL=run.js.map