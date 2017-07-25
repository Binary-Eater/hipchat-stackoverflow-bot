# Atlassian Add-on using Express

Congratulations! You've successfully created a HipChat Connect Add-on using the Express web application framework.

## Running your add-on

Install your dependencies.
```
npm install
```

On a separate terminal, start up an ngrok tunnel to port 3000.

```
ngrok http 3000 # if you've got ngrok installed globally

or

./node_modules/ngrok/bin/ngrok http 3000 # local dependency
```

Copy the __https__ forwarding URL. e.g. https://cace28ac.ngrok.io

```
AC_LOCAL_BASE_URL=https://cace28ac.ngrok.io node app.js
```

Your add-on should now be running on localhost:3000 and forwarded to the ngrok https URL.

Use the ngrok https URL to install the add-on to a HipChat room.

## What's next?
* [Read the HipChat Connect guides](https://developer.atlassian.com/hipchat/guide)
* [View the HipChat API reference](https://www.hipchat.com/docs/apiv2)