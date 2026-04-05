# Deployment

This app is deployed on `lalten.org` at:

- public URL: `https://lalten.org/vega-ui/`
- app code checkout: `/root/lalten/apps/vega-ui`
- systemd unit file: `/root/lalten/vega-ui.service`
- nginx config source: `/root/lalten/nginx.conf`
- local bind: `127.0.0.1:8756`

## Runtime configuration

The deployed service should set:

```bash
HOST=127.0.0.1
PORT=8756
VEGA_UI_BASE_PATH=/vega-ui
```

`VEGA_UI_RELOAD` should be left unset in production.

## Deploy or refresh

From the Hetz server:

```bash
cd /root/lalten/apps/vega-ui
git fetch origin
git checkout feat/stage-a-editor
git pull --ff-only origin feat/stage-a-editor
/snap/bin/uv sync --no-dev
sudo systemctl restart vega-ui.service
sudo nginx -t
sudo systemctl reload nginx
```

## Nginx route shape

The deployed nginx config should proxy `/vega-ui/` to the local app root:

```nginx
location /vega-ui/ {
    proxy_pass http://127.0.0.1:8756/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location = /vega-ui {
    return 301 /vega-ui/;
}
```

The application generates links and redirects with the `/vega-ui` prefix when `VEGA_UI_BASE_PATH=/vega-ui` is set.
