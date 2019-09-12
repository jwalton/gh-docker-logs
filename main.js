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

const ps = run('docker ps --format "table {{.ID}},{{.Image}}" --no-trunc');
// `slice(1)` to remove the 'CONTAINER_ID,IMAGE' header.
const psLines = ps.split(/\r?\n/).slice(1);

const usedFilenames = {};

for (const line of psLines) {
    if (!line) {
        // Last line is an empty line, just skip it.
        continue;
    }

    const [containerId, image] = line.split(',');

    if (!dest) {
        console.log('*********************************************************');
        console.log(image);
        console.log('*********************************************************\n');

        run(`docker logs ${containerId}`, { passthrough: true });
    } else {
        let suffix = '';
        if (!usedFilenames[image]) {
            usedFilenames[image] = 1;
        } else {
            suffix = `-${usedFilenames[image]}`;
            usedFilenames[image]++;
        }
        const filename = `${image.replace(/[\/:]/g, '-')}${suffix}.log`;
        const file = path.resolve(dest, filename);
        console.log(`Writing ${file}`);
        const out = fs.openSync(file, 'w');
        run(`docker logs ${containerId}`, { out });
    }
}
