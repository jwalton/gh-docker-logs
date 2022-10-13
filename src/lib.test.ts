/**
 * @jest-environment node
 */

import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

import chai from 'chai';
import { Container, filterContainers, getContainers, getLogsFromContainer } from './lib';

const { expect } = chai;

const CONTAINER_NAME = 'docker-gh-logs-tester';
const CONTAINER_IMAGE = 'ubuntu:22.10';
const CONTAINER_START_TIMEOUT = 4000;
const TEMP_DIR = path.resolve(__dirname, 'testOut');

async function sleep(ms: number) {
    await new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function startContainer() {
    await exec(`docker run --name=${CONTAINER_NAME} ${CONTAINER_IMAGE} echo "foo"`);
    await sleep(250);
}

async function killContainer() {
    try {
        await exec(`docker rm -f ${CONTAINER_NAME}`);
        // Wait a moment to give the docker process a chance to vanish.
        await sleep(250);
    } catch {
        // ignore
    }
}

describe('gh-docker-logs', () => {
    beforeAll(async () => {
        await killContainer();

        // Create the test out folder and delete anything in it from previous runs.
        await fs.mkdir(TEMP_DIR, { recursive: true });
        const files = await fs.readdir(TEMP_DIR);
        for (const file of files) {
            await fs.rm(path.resolve(TEMP_DIR, file));
        }
    });

    it('should find running containers and get logs', async () => {
        try {
            await startContainer();
            const containers = getContainers().filter(
                (container) => container.name === CONTAINER_NAME
            );
            const container = containers.find((container) => container.name === CONTAINER_NAME);
            if (!container) {
                throw new Error('Did not find container');
            }

            expect(container).to.eql({
                id: container.id,
                image: CONTAINER_IMAGE,
                name: CONTAINER_NAME,
                status: container.status,
            });

            const logFile = `${container.name.replace(/[/:]/g, '-')}.log`;
            const filename = path.resolve(TEMP_DIR, logFile);
            getLogsFromContainer(container.id, { filename });

            const log = await fs.readFile(filename, { encoding: 'utf-8' });
            expect(log, 'log contents').to.contain('foo');
        } finally {
            await killContainer();
        }
    });

    it('should filter running containers', () => {
        const containers: Container[] = [
            { id: 'fake-id-1', image: 'ubuntu:22.10', name: 'test', status: 'Created' },
            { id: 'fake-id-2', image: 'ubuntu-not:22.10', name: 'fake', status: 'Up 3 days' },
            { id: 'fake-id-3', image: 'postgres:14', name: 'db', status: 'Up 9 days' },
        ];

        const filtered = filterContainers(containers, ['ubuntu', 'postgres']);
        expect(filtered).to.eql([
            { id: 'fake-id-1', image: 'ubuntu:22.10', name: 'test', status: 'Created' },
            { id: 'fake-id-3', image: 'postgres:14', name: 'db', status: 'Up 9 days' },
        ]);
    });
});
