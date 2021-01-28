const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const core = require('@actions/core');
const {create: createArtifactClient, UploadOptions} = require('@actions/artifact');

let dest = core.getInput('dest') || undefined;
const images = core.getInput('images') || undefined;
const tail = core.getInput('images') || undefined;
const shell = core.getInput('shell') || undefined;
const artifact = core.getInput('artifact') || undefined;

if (artifact && !dest) {
    dest = '/tmp/gh_docker_logs';
}

const imagesFilter = typeof images === 'string' ? images.split(',') : undefined;

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
        shell,
        encoding: 'utf-8',
        env: process.env,
        stdio,
    });
}

function getContainers() {
    const ps = run(
        'docker ps -a --format "table {{.ID}},{{.Image}},{{.Names}},{{.Status}}" --no-trunc'
    );
    // `slice(1)` to remove the 'CONTAINER_ID,IMAGE,NAMES' header.
    const psLines = ps.split(/\r?\n/).slice(1);

    return (
        psLines
            // Last line is empty - skip it.
            .filter(line => !!line)
            .map(line => {
                const [id, image, name, status] = line.split(',');
                return { id, image, name, status };
            })
    );
}

function filterContainers(containers) {
    return containers.filter(
        container =>
            !imagesFilter ||
            imagesFilter.includes(container.image) ||
            imagesFilter.some(filter => container.image.startsWith(`${filter}:`))
    );
}

if (dest) {
    fs.mkdirSync(dest, { recursive: true });
}

const containers = getContainers();
console.log(`Found ${containers.length} containers...`);
const filteredContainers = filterContainers(containers);
if (imagesFilter) {
    console.log(`Found ${filteredContainers.length} matching containers...`);
}
console.log('\n');

const logsOptions = tail ? `--tail ${tail} ` : '';
let createdFileNames = [];

for (const container of filteredContainers) {
    if (!dest) {
        console.log('**********************************************************************');
        console.log(`* Name  : ${container.name}`);
        console.log(`* Image : ${container.image}`);
        console.log(`* Status: ${container.status}`);
        console.log('**********************************************************************');

        run(`docker logs ${logsOptions} ${container.id}`, { passthrough: true });
    } else {
        const filename = `${container.name.replace(/[\/:]/g, '-')}.log`;
        const file = path.resolve(dest, filename);
        console.log(`Writing ${file}`);
        const out = fs.openSync(file, 'w');
        run(`docker logs ${logsOptions}  ${container.id}`, { out });
        createdFileNames.push(file);
    }
}

if (artifact) {
    const artifactClient = createArtifactClient();
    const uploadResult = await artifactClient.uploadArtifact(
        artifact,
        createdFileNames,
        dest,
        {
            continueOnError: false
        }
    )

    if (uploadResult.failedItems.length > 0) {
        console.log(
          `Docker logs could not be stored as artifact. There are ${uploadResult.failedItems.length} that could not be saved.`
        )
    } else {
        console.log(
          `Docker logs stored as artifact: ${uploadResult.artifactName}`
        )
    }
}
