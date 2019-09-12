const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const core = require('@actions/core');

const dest = core.getInput('dest') || undefined;

function run(cmd, options = {}) {
    let stdio;

    if (options.passthrough) {
        stdio = 'inherit';
    } else if (options.out) {
        stdio = ['pipe', options.out, options.out];
    } else {
        stdio = 'pipe';
    }

    return execSync(cmd, {
        shell: '/bin/bash',
        encoding: 'utf-8',
        env: process.env,
        stdio,
    });
}

if (dest) {
    fs.mkdirSync(dest, { recursive: true });
}

const ps = run(
    'docker ps -a --format "table {{.ID}},{{.Image}},{{.Names}}.{{.Status}}" --no-trunc'
);
// `slice(1)` to remove the 'CONTAINER_ID,IMAGE,NAMES' header.
const psLines = ps.split(/\r?\n/).slice(1);

console.log(`Found ${psLines.lenght} containers...\n`);

for (const line of psLines) {
    if (!line) {
        // Last line is an empty line, just skip it.
        continue;
    }

    const [containerId, image, containerName, containerStatus] = line.split(',');

    if (!dest) {
        console.log('**********************************************************************');
        console.log(`* Name  : ${containerName}`);
        console.log(`* Image : ${image}`);
        console.log(`* Status: ${containerStatus}`);
        console.log('**********************************************************************');

        run(`docker logs ${containerId}`, { passthrough: true });
    } else {
        const filename = `${containerName.replace(/[\/:]/g, '-')}${suffix}.log`;
        const file = path.resolve(dest, filename);
        console.log(`Writing ${file}`);
        const out = fs.openSync(file, 'w');
        run(`docker logs ${containerId}`, { out });
    }
}
