import { execSync, StdioOptions } from 'child_process';
import { Stream } from 'stream';
import fs from 'fs';

export interface Container {
    id: string;
    image: string;
    name: string;
    status: string;
}

function run(
    cmd: string,
    options: {
        shell?: string;
        passthrough?: boolean;
        out?: Stream | number;
    } = {}
) {
    let stdio: StdioOptions;

    if (options.passthrough) {
        stdio = 'inherit';
    } else if (options.out) {
        stdio = ['pipe', options.out, options.out];
    } else {
        stdio = 'pipe';
    }

    return execSync(cmd, {
        shell: options.shell,
        encoding: 'utf-8',
        env: process.env,
        stdio,
    });
}

export function getContainers(options: { shell?: string } = {}): Container[] {
    const ps = run(
        'docker ps -a --format "table {{.ID}},{{.Image}},{{.Names}},{{.Status}}" --no-trunc',
        { shell: options.shell }
    );
    // `slice(1)` to remove the 'CONTAINER_ID,IMAGE,NAMES' header.
    const psLines = ps.split(/\r?\n/).slice(1);

    return (
        psLines
            // Last line is empty - skip it.
            .filter((line) => !!line)
            .map((line) => {
                const [id, image, name, status] = line.split(',');
                return { id, image, name, status };
            })
    );
}

export function filterContainers(
    containers: Container[],
    imagesFilter: string[] | undefined
): Container[] {
    return containers.filter(
        (container) =>
            !imagesFilter ||
            imagesFilter.includes(container.image) ||
            imagesFilter.some((filter) => container.image.startsWith(`${filter}:`))
    );
}

export function getLogsFromContainer(
    containerId: string,
    options: { tail?: boolean; filename?: string }
) {
    const { tail, filename } = options;
    const logsOptions = tail ? `--tail ${tail} ` : '';

    let out: number | undefined;
    if (filename) {
        out = fs.openSync(filename, 'w');
    }

    run(`docker logs ${logsOptions} ${containerId}`, {
        passthrough: !options.filename,
        out,
    });

    if (out !== undefined) {
        fs.closeSync(out);
    }
}
