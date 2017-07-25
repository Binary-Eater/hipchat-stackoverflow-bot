var http = require('request');
var cors = require('cors');
var uuid = require('uuid');
var url = require('url');

// This is the heart of your HipChat Connect add-on. For more information,
// take a look at https://developer.atlassian.com/hipchat/tutorials/getting-started-with-atlassian-connect-express-node-js
module.exports = function (app, addon) {
  var hipchat = require('../lib/hipchat')(addon);

  // simple healthcheck
  app.get('/healthcheck', function (req, res) {
    res.send('OK');
  });

  // Root route. This route will serve the `addon.json` unless a homepage URL is
  // specified in `addon.json`.
  app.get('/',
    function (req, res) {
      // Use content-type negotiation to choose the best way to respond
      res.format({
        // If the request content-type is text-html, it will decide which to serve up
        'text/html': function () {
          var homepage = url.parse(addon.descriptor.links.homepage);
          if (homepage.hostname === req.hostname && homepage.path === req.path) {
            res.render('homepage', addon.descriptor);
          } else {
            res.redirect(addon.descriptor.links.homepage);
          }
        },
        // This logic is here to make sure that the `addon.json` is always
        // served up when requested by the host
        'application/json': function () {
          res.redirect('/atlassian-connect.json');
        }
      });
    }
    );

  // This is an example route that's used by the default for the configuration page
  // https://developer.atlassian.com/hipchat/guide/configuration-page
  app.get('/config',
    // Authenticates the request using the JWT token in the request
    addon.authenticate(),
    function (req, res) {
      // The `addon.authenticate()` middleware populates the following:
      // * req.clientInfo: useful information about the add-on client such as the
      //   clientKey, oauth info, and HipChat account info
      // * req.context: contains the context data accompanying the request like
      //   the roomId
      res.render('config', req.context);
    }
    );

  // This is an example route to handle an incoming webhook
  // https://developer.atlassian.com/hipchat/guide/webhooks
  app.post('/answers',
    addon.authenticate(),
    function (req, res) {
      var question_content = req.body.item.message.message.split(/[ ,]+/).filter(Boolean);
      question_content.splice(0, 1);
      question_content = question_content.join("%20");
      var url = 'https://api.stackexchange.com/2.2/search/advanced?order=desc&sort=relevance' +
          '&q='+question_content+'&answers=1&site=stackoverflow';
      var req_info = { headers: {
            'Accept': 'application/json; charset=utf-8',
                'User-Agent': 'RandomHeader'
        },
        uri: url,
            method: 'GET',
            gzip: true
    };
      http(req_info, function (error, response, body) {
          if (error) {
              console.log('Error:', error);
              return;
          }

        if (response.statusCode!==200) {
            console.log('Response Code: ', response.statusCode);
            return;
        }
        var resp_json_array = JSON.parse(body).items;

        for (var i = 0; i < resp_json_array.length; i++) {
            if (!resp_json_array[i].accepted_answer_id) {
                continue;
            }
            if (!resp_json_array[i].score || resp_json_array[i].score > 100) {
                continue;
            }
            var answer_id = resp_json_array[i].accepted_answer_id;
            var answer_url = 'https://api.stackexchange.com/2.2/answers/' +
                answer_id + '?order=desc&filter=withbody&sort=creation&site=stackoverflow';
            var req_info = { headers: {
                'Accept': 'application/json; charset=utf-8',
                'User-Agent': 'RandomHeader'
            },
                uri: answer_url,
                method: 'GET',
                gzip: true
            };
            http(req_info, function (error, response, body) {
                if (error) {
                    console.log('Error: ', error);
                    return;
                }
                if (response.statusCode!==200) {
                    console.log('Response Code: ', response.statusCode);
                    return;
                }
                var ans_json = JSON.parse(body)['items'];
                if (ans_json.length===0) {
                    console.log('Wow! This question cannot be responded to!');
                    rest_cb('<p>Wow! I cannot respond to this question....</p>\n');
                }
                rest_cb(ans_json[0]['body']);
            });
            return;
        }
        console.log('Wow! This question cannot be responded to!');
        rest_cb('<p>Wow! I cannot respond to this question....</p>\n');
      });

      function rest_cb(response_text) {
          var opts = { 'options': { 'color': 'green', 'format' : 'html' } };
          hipchat.sendMessage(req.clientInfo, req.identity.roomId, response_text, opts)
              .then(function (data) {
                  res.sendStatus(200);
              });
      }

    }
    );

  // Notify the room that the add-on was installed. To learn more about
  // Connect's install flow, check out:
  // https://developer.atlassian.com/hipchat/guide/installation-flow
  addon.on('installed', function (clientKey, clientInfo, req) {
    hipchat.sendMessage(clientInfo, req.body.roomId, addon.descriptor.name + ' add-on has been installed in this room');
  });

  // Clean up clients when uninstalled
  addon.on('uninstalled', function (id) {
    addon.settings.client.keys(id + ':*', function (err, rep) {
      rep.forEach(function (k) {
        addon.logger.info('Removing key:', k);
        addon.settings.client.del(k);
      });
    });
  });

};
