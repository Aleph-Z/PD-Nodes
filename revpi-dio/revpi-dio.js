/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
  "use strict";
  var exec = require("child_process").exec;
  var spawn = require("child_process").spawn;
  var fs = require("fs");
  var revpidioCommand = __dirname + "/revpidio";
  var allOK = true;
  //Validation here---

  // the magic to make python print stuff immediately
  process.env.PYTHONUNBUFFERED = 1;

  function RevPiDIOIN(config) {
    RED.nodes.createNode(this, config);
    this.name = config.name;
    this.pinname = config.pinname;
    var node = this;
    if (allOK === true) {
      if (this.pinname !== undefined) {
        node.child = spawn(revpidioCommand, ["in", this.pinname]);
        node.running = true;
        node.status({ fill: "green", shape: "dot", text: "common.status.ok" });
        node.child.stdout.on("data", function(data) {
          node.send({ payload: data.toString() });
        });

        node.child.stderr.on("data", function(data) {
          if (RED.settings.verbose) {
            node.log("err: " + data + " :");
          }
        });

        node.child.on("close", function(code) {
          node.running = false;
          node.child = null;

          if (RED.settings.verbose) {
            node.log(RED._("revpi-dio.status.closed"));
          }
          if (node.done) {
            node.status({
              fill: "grey",
              shape: "ring",
              text: "revpi-dio.status.closed"
            });
            node.done();
          } else {
            node.status({
              fill: "red",
              shape: "ring",
              text: "revpi-dio.status.stopped"
            });
          }
        });

        node.child.on("error", function(err) {
          if (err.errno === "ENOENT") {
            node.error(RED._("revpi-dio.errors.commandnotfound"));
          } else if (err.errno === "EACCES") {
            node.error(RED._("revpi-dio.errors.commandnotexecutable"));
          } else {
            node.error(RED._("revpi-dio.errors.error", { error: err.errno }));
          }
        });
      } else {
        node.warn(RED._("revpi-dio.errors.invalidpin") + ": " + this.pinname);
      }
    }
    node.on("close", function(done) {
      node.status({
        fill: "grey",
        shape: "ring",
        text: "rpi-gpio.status.closed"
      });
      if (node.child != null) {
        node.done = done;
        node.child.stdin.write("close " + this.pinname);
        node.child.kill("SIGKILL");
      } else {
        done();
      }
    });
  }
  RED.nodes.registerType("revpi-dio in", RevPiDIOIN);

  function RevPiDIOOUT(config) {
    RED.nodes.createNode(this, config);
    this.name = config.name;
    this.pinname = config.pinname;
    var node = this;

    function inputlistener(msg) {
      if (msg.payload === "true") {
        msg.payload = true;
      }
      if (msg.payload === "false") {
        msg.payload = false;
      }
      var out = Number(msg.payload);
      var limit = 1;

      if (out >= 0 && out <= limit) {
        if (allOK === true) {
          if (this.pinname !== undefined) {
            node.child = spawn(revpidioCommand, ["out", this.pinname, out]);
            node.running = true;
            node.status({
              fill: "green",
              shape: "dot",
              text: "common.status.ok"
            });

            node.child.stdout.on("data", function(data) {
              node.send({ payload: data.toString() });
            });

            node.child.stderr.on("data", function(data) {
              if (RED.settings.verbose) {
                node.log("err: " + data + " :");
              }
            });

            node.child.on("close", function(code) {
              node.running = false;
              node.child = null;
              if (RED.settings.verbose) {
                node.log(RED._("revpi-dio.status.closed"));
              }
              if (node.done) {
                node.status({
                  fill: "grey",
                  shape: "ring",
                  text: "revpi-dio.status.closed"
                });
                node.done();
              } else {
                node.status({
                  fill: "red",
                  shape: "ring",
                  text: "revpi-dio.status.stopped"
                });
              }
            });

            node.child.on("error", function(err) {
              if (err.errno === "ENOENT") {
                node.error(RED._("revpi-dio.errors.commandnotfound"));
              } else if (err.errno === "EACCES") {
                node.error(RED._("revpi-dio.errors.commandnotexecutable"));
              } else {
                node.error(
                  RED._("revpi-dio.errors.error", { error: err.errno })
                );
              }
            });
          } else {
            node.warn(
              RED._("revpi-dio.errors.invalidpin") + ": " + this.pinname
            );
          }
        }
      }
    }
    node.on("input", inputlistener);
  }
  RED.nodes.registerType("revpi-dio out", RevPiDIOOUT);
};
