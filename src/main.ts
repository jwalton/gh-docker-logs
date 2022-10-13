import * as core from '@actions/core';
import fs from 'fs';
import path from 'path';
import { filterContainers, getContainers, getLogsFromContainer } from './lib';

const dest = core.getInput('dest') || undefined;
const images = core.getInput('images') || undefined;
const tail = core.getInput('tail');
const shell = core.getInput('shell');

const imagesFilter = typeof images === 'string' ? images.split(',') : undefined;

if (dest) {
    fs.mkdirSync(dest, { recursive: true });
}

const containers = getContainers({ shell });

console.log(`Found ${containers.length} containers...`);
const filteredContainers = filterContainers(containers, imagesFilter);
if (imagesFilter) {
    console.log(`Found ${filteredContainers.length} matching containers...`);
}
console.log('\n');

for (const container of filteredContainers) {
    if (!dest) {
        console.log(`::group::${container.image} (${container.name})`);
        console.log('**********************************************************************');
        console.log(`* Name  : ${container.name}`);
        console.log(`* Image : ${container.image}`);
        console.log(`* Status: ${container.status}`);
        console.log('**********************************************************************');

        getLogsFromContainer(container.id, { tail: !!tail });
        console.log(`::endgroup::`);
    } else {
        const logFile = `${container.name.replace(/[/:]/g, '-')}.log`;
        const filename = path.resolve(dest, logFile);
        console.log(`Writing ${filename}`);
        getLogsFromContainer(container.id, { tail: !!tail, filename });
    }
}
