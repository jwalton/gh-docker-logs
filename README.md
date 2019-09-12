# Collect Docker Logs

This is a GitHub Action which will collect logs from all running docker
containers. Logs can either be dumped to stdout, or can be written to a
folder (where you can tar them up and
[upload them as an artifact](https://github.com/actions/upload-artifact)).

## Inputs

- `dest` - Destination folder to write to. If not provided, logs will be
  written to stdout. If provided, the folder will be created if it doesn't
  exist, and files will be written based on container names (e.g. 'redis.log').

## Usage

## Dump all logs on a failure

```yaml
- name: Dump docker logs on failure
  if: failure()
  uses: jwalton/gh-docker-logs@v1
```

## Upload tarball as artifact

```yaml
- name: Collect docker logs on failure
  if: failure()
  uses: jwalton/gh-docker-logs@v1
  with:
    dest: './logs'
- name: Tar logs
  if: failure()
  run: tar cvzf ./logs.tgz ./logs
- name: Upload logs to GitHub
  uses: actions/upload-artifact@master
  with:
    name: logs.tgz
    path: ./logs.tgz
```
