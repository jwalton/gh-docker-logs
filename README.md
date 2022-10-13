# Collect Docker Logs

[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

This is a GitHub Action which will collect logs from all running docker
containers. Logs can either be dumped to stdout, or can be written to a
folder (where you can tar them up and
[upload them as an artifact](https://github.com/actions/upload-artifact)).

## Inputs

- `dest` - Destination folder to write to. If not provided, logs will be
  written to stdout. If provided, the folder will be created if it doesn't
  exist, and files will be written based on container names (e.g. 'redis.log').

- `images` - A comma delimited list of image names. If provided, only output
  from containers with these images will be shown. Containers will match if
  the image matches exactly (e.g. "mongo:3.4.22") or if the image name matches
  without a tag (e.g. "mongo" will match "mongo:3.4.22").

- `tail` - Max number of lines to show from each container.  Defaults to "all".

- `shell` - Shell to execute commands.  Defaults to "/bin/sh".

## Usage

## Dump all logs on a failure

```yaml
- name: Dump docker logs on failure
  if: failure()
  uses: jwalton/gh-docker-logs@v2
```

## Dump redis and mongodb logs

```yaml
- name: Dump redis logs
  uses: jwalton/gh-docker-logs@v2
  with:
    images: 'redis,mongo'
    # Only show last 100 lines of each
    tail: '100'
```

## Upload tarball as artifact

```yaml
- name: Collect docker logs on failure
  if: failure()
  uses: jwalton/gh-docker-logs@v2
  with:
    dest: './logs'
- name: Tar logs
  if: failure()
  run: tar cvzf ./logs.tgz ./logs
- name: Upload logs to GitHub
  if: failure()
  uses: actions/upload-artifact@master
  with:
    name: logs.tgz
    path: ./logs.tgz
```

## Dump all logs on a failure using different shell

```yaml
- name: Dump docker logs on failure using different shell
  if: failure()
  uses: jwalton/gh-docker-logs@v2
  with:
    shell: '/bin/sh'
```
