require("dotenv").config({
  path: "/node/on5-webchat-backend/env/.onx_bankbnc.env",
});

console.log("process.env.REDIS_HOST", process.env.REDIS_HOST);
const fs = require("fs");
const FormData = require("form-data");
const https = require("https");
const http = require("http");
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { v4: uuidV4 } = require("uuid");
const io = require("socket.io")();
const socketAuth = require("socketio-auth");
const adapter = require("socket.io-redis");
const date = require("date-and-time");
const axios = require("axios");
const request = require("request");

const redis = require("./redis");
const cache = require("./cache");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const PORT = parseInt(process.env.PORT) || 9000;

const server = http.createServer(app);

const redisAdapter = adapter({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASS || "password",
});

console.log("index >> redis host", process.env.REDIS_HOST);
console.log("index >> redis port", process.env.REDIS_PORT);
console.log("index >> redis password", process.env.REDIS_PASS);

// Test API
app.get("/", (req, res) => {
  res.send("SUCCESS BERKAHX");
});
app.get("/test", (req, res) => {
  res.send("OKX");
});

// Admin API
app.get("/sessions/:password", (req, res) => {
  const password = req.params.password;

  if (password !== process.env.SESSION_PASSWORD) {
    return res.status(200).json({ message: "unauthorized" });
  }

  const allSessions = cache.keys();
  return res.status(200).json({ sessions: allSessions });
});
app.get("/session/:password/:sessionKey", (req, res) => {
  const password = req.params.password;
  const sessionKey = req.params.sessionKey;
  if (password !== process.env.SESSION_PASSWORD) {
    return res.status(200).json({ message: "unauthorized" });
  }

  const session = cache.get(`${sessionKey}`);
  return res.status(200).json({ data: session });
});
// Admin API

// BOT API
app.post("/bot/reply/text", async (req, res) => {
  const token = req.body.token;
  const message = req.body.message;
  const from = req.body.fromName;
  if (token === "undefined" || !token || token === "") {
    return res.status(200).json({
      error: true,
      message: "Token must be provided.",
    });
  }
  if (from === "undefined" || !from || from === "") {
    return res.status(200).json({
      error: true,
      message: "'From' must be provided.",
    });
  }

  addChatHistory(
    `livechat:history:${process.env.SESSION_KEY}:${token}`,
    "agent",
    from,
    message,
    "text"
  );
  const socketId = await redis.getAsync(
    `livechat:${process.env.SESSION_KEY}:${token}`
  );

  if (socketId) {
    io.to(socketId).emit("agent:message:text", { message, from });
    return res.json({ token, sent: true });
  } else {
    return res.json({ token, sent: false });
  }
});
app.post("/bot/reply/button", async (req, res) => {
  const token = req.body.token;
  const message = req.body.message;
  const from = req.body.fromName;
  if (token === "undefined" || !token || token === "") {
    return res.status(200).json({
      error: true,
      message: "Token must be provided.",
    });
  }
  if (from === "undefined" || !from || from === "") {
    return res.status(200).json({
      error: true,
      message: "'From' must be provided.",
    });
  }

  addChatHistory(
    `livechat:history:${process.env.SESSION_KEY}:${token}`,
    "agent",
    from,
    message,
    "button"
  );
  const socketId = await redis.getAsync(
    `livechat:${process.env.SESSION_KEY}:${token}`
  );

  if (socketId) {
    io.to(socketId).emit("agent:message:button", { message, from });
    return res.json({ token, sent: true });
  } else {
    return res.json({ token, sent: false });
  }
});
app.post("/bot/reply/carousel", async (req, res) => {
  const token = req.body.token;
  const message = req.body.message;
  const from = req.body.fromName;
  if (token === "undefined" || !token || token === "") {
    return res.status(200).json({
      error: true,
      message: "Token must be provided.",
    });
  }
  if (from === "undefined" || !from || from === "") {
    return res.status(200).json({
      error: true,
      message: "'From' must be provided.",
    });
  }

  addChatHistory(
    `livechat:history:${process.env.SESSION_KEY}:${token}`,
    "agent",
    from,
    message,
    "carousel"
  );
  const socketId = await redis.getAsync(
    `livechat:${process.env.SESSION_KEY}:${token}`
  );

  if (socketId) {
    io.to(socketId).emit("agent:message:carousel", { message, from });
    return res.json({ token, sent: true });
  } else {
    return res.json({ token, sent: false });
  }
});
// BOT API


// Agent API
app.post("/agent/reply/text", async (req, res) => {
  const token = req.body.token;
  const message = req.body.message;
  const from = req.body.fromName;
  if (token === "undefined" || !token || token === "") {
    return res.status(200).json({
      error: true,
      message: "Token must be provided.",
    });
  }
  if (from === "undefined" || !from || from === "") {
    return res.status(200).json({
      error: true,
      message: "'From' must be provided.",
    });
  }

  addChatHistory(
    `livechat:history:${process.env.SESSION_KEY}:${token}`,
    "agent",
    from,
    message,
    "text"
  );
  const socketId = await redis.getAsync(
    `livechat:${process.env.SESSION_KEY}:${token}`
  );

  if (socketId) {
    io.to(socketId).emit("agent:message:text", { message, from });
    return res.send(socketId);
  }

  const postData = {
    token,
    message: "Pelanggan telah mengakhiri sesi percakapan.",
  };

  // Abandon
  const options = {
    method: "POST",
    url: `${process.env.URL_BASE}/client/reply/text`,
    rejectUnauthorized: false,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  };

  // // End Session Bot
  // const optionsSessionBot = {
  //   method: "POST",
  //   url: `${process.env.URL_MIDDLEWARE_END}`,
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     account_id: process.env.ACCOUNT_ID,
  //     unique_id: token
  //   }),
  // };

  // request(optionsSessionBot, async function (error, response) {
  //   try {
  //     console.log('response abandon end session bot', response);
  //     if (error) throw new Error(error);
  //   } catch (error) {
  //     console.log("error end session bot", error.message)
  //   }
  // });

  request(options, async function (error, response) {
    try {
      if (error) throw new Error(error);
      return res.status(201).send("Abandon");
    } catch (error) {
      return res
        .status(500)
        .json({ error: true, message: error.message, errorType: "Abandon" });
    }
  });
});
app.post("/agent/reply/media", async (req, res) => {
  const token = req.body.token;
  const message = req.body.message;
  const from = req.body.fromName;
  if (token === "undefined" || !token || token === "") {
    return res.status(200).json({
      error: true,
      message: "Token must be provided.",
    });
  }
  if (from === "undefined" || !from || from === "") {
    return res.status(200).json({
      error: true,
      message: "'From' must be provided.",
    });
  }

  addChatHistory(
    `livechat:history:${process.env.SESSION_KEY}:${token}`,
    "agent",
    from,
    message,
    "media"
  );
  const socketId = await redis.getAsync(
    `livechat:${process.env.SESSION_KEY}:${token}`
  );
  if (socketId) {
    io.to(socketId).emit("agent:message:media", { message, from });
    return res.send(socketId);
  }
  const postData = {
    token,
    message: "Pelanggan telah mengakhiri sesi percakapan.",
  };

  // Abandon
  const options = {
    method: "POST",
    url: `${process.env.URL_BASE}/client/reply/text`,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  };

  request(options, async function (error, response) {
    try {
      if (error) throw new Error(error);
      return res.status(201).send("");
    } catch (error) {
      res.status(200).json({ error: true, message: error.message });
    }
  });
});
app.post("/agent/endSession", async (req, res) => {
  const token = req.body.token;
  const from = req.body.fromName;
  if (!token || typeof token === "undefined" || token === "") {
    return res.status(400).json({
      session: null,
      error: true,
      message: "Token is not Provided.",
    });
  }
  if (from === "undefined" || !from || from === "") {
    return res.status(200).json({
      error: true,
      message: "'From' must be provided.",
    });
  }
  const socketId = await redis.getAsync(
    `livechat:${process.env.SESSION_KEY}:${token}`
  );
  if (socketId) {
    io.to(socketId).emit("agent:event:endSession", {
      message: token,
      from,
    });
  }
  cache.del(`${process.env.SESSION_KEY}:${token}`);
  await redis.delAsync(`livechat:${process.env.SESSION_KEY}:${token}`);
  await redis.delAsync(`livechat:history:${process.env.SESSION_KEY}:${token}`);

  // const options = {
  //   method: "POST",
  //   url: `${process.env.URL_MIDDLEWARE}`,
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify(postData),
  // };
  // request(options, async function (error, response) {
  //   try {
  //     if (error) throw new Error(error);
  //     const { username } = cachedUser.info;
  //     await addChatHistory(
  //       `livechat:history:${process.env.SESSION_KEY}:${token}`,
  //       "customer",
  //       username,
  //       message,
  //       "text"
  //     );
  //     return res.status(201).json(req.body);
  //   } catch (error) {
  //     res.status(500).json({ error: true, message: error.message });
  //   }
  // });

  // End Session Bot
  const optionsSessionBot = {
    method: "POST",
    url: `${process.env.URL_MIDDLEWARE_END}`,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      account_id: process.env.ACCOUNT_ID,
      unique_id: token
    }),
  };
  request(optionsSessionBot, async function (error, response) {
    try {
      if (error) throw new Error(error);
    } catch (error) {
      console.log("error end session bot", error.message)
    }
  });

  return res.status(200).json({
    session: token,
    error: false,
    message: "Session delete.",
  });
});
// Agent API

// Client API
app.post("/createSession", async (req, res) => {
  const token = uuidV4();
  // let captchaSecret = process.env.CAPTCHA_SECRET;
  // let captchaUrl = process.env.CAPTCHA_URL;
  // if (captchaSecret !== "") {
  //   if (typeof req.body["g-recaptcha-response"] === "undefined") {
  //     return res
  //       .status(200)
  //       .json({ error: true, message: "Captcha not found" });
  //   }

  //   let captchaResponse = req.body["g-recaptcha-response"];
  //   captchaResponse = encodeURI(captchaResponse);

  //   const url = `${captchaUrl}?secret=${captchaSecret}&response=${captchaResponse}`;
  //   const result = await axios.get(url);
  //   const captchaResponseAPI = result.data;
  //   if (!captchaResponseAPI.success) {
  //     return res.status(200).json({
  //       error: true,
  //       message: "Captcha challenge fail",
  //       errorMessage: captchaResponseAPI["error-codes"],
  //     });
  //   }
  // }

  cache.set(`${process.env.SESSION_KEY}:${token}`, {
    token,
    info: req.body,
  });

  return res.status(201).json({
    session: token,
    error: false,
    message: "Session created.",
  });

});
app.post("/endSession", async (req, res) => {
  const token = req.body.token;
  const message = "#endSession";
  // console.log("==================================================== message", message);
  if (!token || typeof token === "undefined" || token === "") {
    return res.status(400).json({
      session: null,
      error: true,
      message: "Token is not Provided.",
    });
  }

  const cachedUser = cache.get(`${process.env.SESSION_KEY}:${token}`);

  cache.del(`${process.env.SESSION_KEY}:${token}`);
  await redis.delAsync(`livechat:${process.env.SESSION_KEY}:${token}`);
  await redis.delAsync(`livechat:history:${process.env.SESSION_KEY}:${token}`);
  console.log("==================================================== cachedUser", cachedUser);
  const postData = {
    tenant: process.env.TENANT_ID,
    account: process.env.ACCOUNT_ID,
    message_origin: { ...req.body },
    message: { message, user: { ...cachedUser.info }, token },
    action: "clientEndSession",
    dateSend: date.format(new Date(), "YYYY-MM-DD HH:mm:ss"),
  };
  console.log("==================================================== postData", postData);

  const options = {
    method: "POST",
    url: `${process.env.URL_MIDDLEWARE_HANDOVER}/incoming/webchat`,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  };
  // console.log("==================================================== options", options);
  request(options, async function (error, response) {
    try {
      if (error) throw new Error(error);
      return res.status(200).json({
        session: token,
        error: false,
        message: "End Session success",
      });
    } catch (error) {
      res.status(500).json({ error: true, message: error.message });
    }
  });
  // End Session Bot
  // const optionsSessionBot = {
  //   method: "POST",
  //   url: `${process.env.URL_MIDDLEWARE_HANDOVER}`,
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     account_id: process.env.ACCOUNT_ID,
  //     message: message,
  //     unique_id: token
  //   }),
  // };
  // request(optionsSessionBot, async function (error, response) {
  //   try {
  //     console.log('response end session bot', response)
  //     if (error) throw new Error(error);
  //   } catch (error) {
  //     console.log("error end session bot", error.message)
  //   }
  // });
  // return res.status(200).json({
  //   session: token,
  //   error: false,
  //   message: "End Session success",
  // });
  // End Session Bot
});
app.post("/client/reply/text", async (req, res) => {
  const token = req.body.token;
  const message = req.body.message;
  if (token === "undefined" || !token || token === "") {
    return res.status(200).json({
      error: true,
      message: "Token must be provided.",
    });
  }
  const cachedUser = cache.get(`${process.env.SESSION_KEY}:${token}`);
  if (!cachedUser) {
    return res.status(200).json({ error: true, message: "User not found" });
  }

  const postData = {
    account: process.env.ACCOUNT_ID,
    tenant: process.env.TENANT_ID,
    message_origin: { ...req.body },
    message: message,
    user: { ...cachedUser.info, token },
    action: "clientReplyText",
    dateSend: date.format(new Date(), "YYYY-MM-DD HH:mm:ss"),
  };
  const options = {
    method: "POST",
    url: `${process.env.URL_MIDDLEWARE}`,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  };
  request(options, async function (error, response) {
    try {
      if (error) throw new Error(error);
      const { username } = cachedUser.info;
      await addChatHistory(
        `livechat:history:${process.env.SESSION_KEY}:${token}`,
        "customer",
        username,
        message,
        "text"
      );
      return res.status(201).json(req.body);
    } catch (error) {
      res.status(200).json({ error: true, message: error.message });
    }
  });
});
app.post("/client/reply/location", async (req, res) => {
  const token = req.body.token;
  const message = req.body.message;
  if (token === "undefined" || !token || token === "") {
    return res.status(200).json({
      error: true,
      message: "Token must be provided.",
    });
  }
  if (
    message.latitude === "undefined" ||
    !message.latitude ||
    message.latitude === ""
  ) {
    return res.status(200).json({
      error: true,
      message: "latitude undefined",
    });
  }
  if (
    message.longitude === "undefined" ||
    !message.longitude ||
    message.longitude === ""
  ) {
    return res.status(200).json({
      error: true,
      message: "longitude undefined",
    });
  }
  const cachedUser = cache.get(`${process.env.SESSION_KEY}:${token}`);
  if (!cachedUser) {
    return res.status(200).json({ error: true, message: "User not found" });
  }

  const postData = {
    tenant: process.env.TENANT_ID,
    message_origin: { ...req.body },
    location: { message, user: { ...cachedUser.info }, token },
    action: "clientReplyLocation",
    dateSend: date.format(new Date(), "YYYY-MM-DD HH:mm:ss"),
  };
  const options = {
    method: "POST",
    url: `${process.env.URL_MIDDLEWARE}`,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  };
  request(options, async function (error, response) {
    try {
      if (error) throw new Error(error);
      const { username } = cachedUser.info;
      await addChatHistory(
        `livechat:history:${process.env.SESSION_KEY}:${token}`,
        "customer",
        username,
        message,
        "location"
      );
      return res.status(201).json(req.body);
    } catch (error) {
      res.status(200).json({ error: true, message: error.message });
    }
  });
});
app.post("/client/reply/button", async (req, res) => {
  const token = req.body.token;
  const message = req.body.message;
  if (token === "undefined" || !token || token === "") {
    return res.status(200).json({
      error: true,
      message: "Token must be provided.",
    });
  }
  const cachedUser = cache.get(`${process.env.SESSION_KEY}:${token}`);
  if (!cachedUser) {
    return res.status(200).json({ error: true, message: "User not found" });
  }

  const postData = {
    account: process.env.ACCOUNT_ID,
    tenant: process.env.TENANT_ID,
    message_origin: { ...req.body },
    message: message,
    user: { ...cachedUser.info, token },
    action: "clientReplyButton",
    dateSend: date.format(new Date(), "YYYY-MM-DD HH:mm:ss"),
  };

  const options = {
    method: "POST",
    url: process.env.URL_MIDDLEWARE,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  };
  request(options, async function (error, response) {
    try {
      if (error) throw new Error(error);
      const { username } = cachedUser.info;
      await addChatHistory(
        `livechat:history:${process.env.SESSION_KEY}:${token}`,
        "customer",
        username,
        message,
        "text"
      );
      return res.status(201).json(req.body);
    } catch (error) {
      res.status(200).json({ error: true, message: error.message });
    }
  });
});
app.post("/client/reply/carousel", async (req, res) => {
  const token = req.body.token;
  const message = req.body.message;
  if (token === "undefined" || !token || token === "") {
    return res.status(200).json({
      error: true,
      message: "Token must be provided.",
    });
  }
  const cachedUser = cache.get(`${process.env.SESSION_KEY}:${token}`);
  if (!cachedUser) {
    return res.status(200).json({ error: true, message: "User not found" });
  }

  const postData = {
    account: process.env.ACCOUNT_ID,
    tenant: process.env.TENANT_ID,
    message_origin: { ...req.body },
    message: message,
    user: { ...cachedUser.info, token },
    action: "clientReplyCarousel",
    dateSend: date.format(new Date(), "YYYY-MM-DD HH:mm:ss"),
  };

  const options = {
    method: "POST",
    url: process.env.URL_MIDDLEWARE,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  };
  request(options, async function (error, response) {
    try {
      if (error) throw new Error(error);
      const { username } = cachedUser.info;
      await addChatHistory(
        `livechat:history:${process.env.SESSION_KEY}:${token}`,
        "customer",
        username,
        message,
        "text"
      );
      return res.status(201).json(req.body);
    } catch (error) {
      res.status(200).json({ error: true, message: error.message });
    }
  });
});
app.post("/client/reply/media", (req, res) => {
  const token = req.body.token;
  const message = req.body.message;
  if (token === "undefined" || !token || token === "") {
    return res.status(200).json({
      error: true,
      message: "Token must be provided.",
    });
  }
  const cachedUser = cache.get(`${process.env.SESSION_KEY}:${token}`);
  if (!cachedUser) {
    return res.status(200).json({ error: true, message: "User not found" });
  }
  const postData = {
    account: process.env.ACCOUNT_ID,
    tenant: process.env.TENANT_ID,
    message_origin: { ...req.body },
    media: { ...message },
    action: "clientReplyMedia",
    user: { ...cachedUser.info, token },
    dateSend: date.format(new Date(), "YYYY-MM-DD HH:mm:ss"),
  };

  const options = {
    method: "POST",
    url: `${process.env.URL_MIDDLEWARE}`,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  };
  request(options, async function (error, response) {
    try {
      if (error) throw new Error(error);
      const { username } = cachedUser.info;
      await addChatHistory(
        `livechat:history:${process.env.SESSION_KEY}:${token}`,
        "customer",
        username,
        message,
        "media"
      );
      console.log("response.body", response.body)
      return res.status(201).json(req.body);
    } catch (error) {
      res.status(200).json({ error: true, message: error.message });
    }
  });
});
app.post("/client/getChatHistory", async (req, res) => {
  const token = req.body.token;
  if (token === "undefined" || !token || token === "") {
    return res.status(200).json({
      error: true,
      message: "Token must be provided.",
    });
  }
  const chatData = await redis.getAsync(
    `livechat:history:${process.env.SESSION_KEY}:${token}`
  );
  return res.status(200).json({ data: JSON.parse(chatData), error: false });
});
app.post(
  "/client/upload/media",
  multer({ dest: `./uploads/${process.env.TENANT_ID}` }).single("files"),
  (req, res) => {
    const token = req.body.token;

    let file_ext = req.file.originalname.split(".").pop();
    if (file_ext == 'svg') {
      return res.status(401).json({
        error: true,
        message: "SVG extension is not allowed",
      });
    }

    if (token === "undefined" || !token || token === "") {
      return res.status(200).json({
        error: true,
        message: "Token must be provided.",
      });
    }

    const cachedUser = cache.get(`${process.env.SESSION_KEY}:${token}`);
    if (!cachedUser) {
      return res.status(200).json({ error: true, message: "User not found" });
    }

    const options = {
      method: "POST",
      url: `${process.env.URL_MINIO}/minio/upload`,
      formData: {
        files: {
          value: fs.createReadStream(req.file.path),
          options: {
            filename:
              req.filename + "." + req.file.originalname.split(".").pop(),
          },
        },
        directory: process.env.TENANT_ID,
        folder: process.env.TENANT_ID,
        token: token,
      },
    };

    request(options, async function (error, response) {
      try {
        if (error) throw new Error(error);

        fs.unlink(req.file.path, (err) => {
          try {
            if (err) throw err;

            return res.status(201).json(JSON.parse(response.body));
          } catch (error) {
            return res
              .status(500)
              .json({ error: true, message: error.message });
          }
        });
      } catch (error) {
        res.status(200).json({ error: true, message: error.message });
      }
    });
  }
);
// Client API

// Handover API
app.post("/client/rating", (req, res, next) => {
  const rating = req.body.rating;
  const token = req.body.token;

  if (rating === "undefined") {
    return res.status(200).json({
      error: true,
      message: "'Rating' value must be provided.",
    });
  }
  if (token === "undefined" || !token || token === "") {
    return res.status(200).json({
      error: true,
      message: "'token' must be provided.",
    });
  }
  const postData = {
    tenant: process.env.TENANT_ID,
    message: { rating, token },
    action: "clientRating",
    dateSend: date.format(new Date(), "YYYY-MM-DD HH:mm:ss"),
  };
  const options = {
    method: "POST",
    url: `${process.env.URL_MIDDLEWARE_HANDOVER}/incoming/webchat`,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  };

  request(options, async function (error, response) {
    try {
      if (error) throw new Error(error);
      return res.status(201).json(req.body);
    } catch (error) {
      res.status(200).json({ error: true, message: error.message });
    }
  });
});
app.post("/handover/createSession", async (req, res) => {
  console.log('/handover/createSession req.body', req.body)
  const token = req.body.token
  const postData = {
    account: process.env.ACCOUNT_ID,
    tenant: process.env.TENANT_ID,
    message: { ...req.body },
    action: "createSession",
    dateSend: new Date()
  };
  const options = {
    method: "POST",
    url: `${process.env.URL_MIDDLEWARE_HANDOVER}/incoming/webchat`,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  };
  request(options, function (error, response) {
    try {
      if (error) throw new Error(error);
      console.log("response.body", response.body)
      if (response.statusCode >= 400) {
        return res.status(200).json({ error: true, message: JSON.parse(response.body) })
      }

      cache.set(`${process.env.SESSION_KEY}:${token}`, {
        token,
        info: req.body,
      });

      return res.status(201).json({
        session: token,
        error: false,
        message: "Session created.",
      });
    } catch (error) {
      res.status(200).json({ error: true, message: error.message });
    }
  });
});
app.post("/handover/reply/text", async (req, res) => {
  const token = req.body.token;
  const message = req.body.message;
  if (token === "undefined" || !token || token === "") {
    return res.status(200).json({
      error: true,
      message: "Token must be provided.",
    });
  }
  const cachedUser = cache.get(`${process.env.SESSION_KEY}:${token}`);
  if (!cachedUser) {
    return res.status(200).json({ error: true, message: "User not found" });
  }

  const postData = {
    account: process.env.ACCOUNT_ID,
    tenant: process.env.TENANT_ID,
    message: { message, user: { ...cachedUser.info }, token },
    user: { ...cachedUser.info, token },
    action: "clientReplyText",
    dateSend: date.format(new Date(), "YYYY-MM-DD HH:mm:ss"),
  };

  const options = {
    method: "POST",
    url: `${process.env.URL_MIDDLEWARE_HANDOVER}/incoming/webchat`,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  };
  request(options, async function (error, response) {
    try {
      if (error) throw new Error(error);
      const { username } = cachedUser.info;
      console.log('response.body', response.body)
      await addChatHistory(
        `livechat:history:${process.env.SESSION_KEY}:${token}`,
        "customer",
        username,
        message,
        "text"
      );
      return res.status(201).json(req.body);
    } catch (error) {
      res.status(200).json({ error: true, message: error.message });
    }
  });
});
app.post("/handover/reply/location", async (req, res) => {
  const token = req.body.token;
  const message = req.body.message;
  if (token === "undefined" || !token || token === "") {
    return res.status(200).json({
      error: true,
      message: "Token must be provided.",
    });
  }
  if (
    message.latitude === "undefined" ||
    !message.latitude ||
    message.latitude === ""
  ) {
    return res.status(200).json({
      error: true,
      message: "latitude undefined",
    });
  }
  if (
    message.longitude === "undefined" ||
    !message.longitude ||
    message.longitude === ""
  ) {
    return res.status(200).json({
      error: true,
      message: "longitude undefined",
    });
  }
  const cachedUser = cache.get(`${process.env.SESSION_KEY}:${token}`);
  if (!cachedUser) {
    return res.status(200).json({ error: true, message: "User not found" });
  }

  const postData = {
    tenant: process.env.TENANT_ID,
    location: { message, user: { ...cachedUser.info }, token },
    action: "clientReplyLocation",
    dateSend: date.format(new Date(), "YYYY-MM-DD HH:mm:ss"),
  };
  const options = {
    method: "POST",
    url: `${process.env.URL_MIDDLEWARE_HANDOVER}/incoming/webchat`,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  };
  request(options, async function (error, response) {
    try {
      if (error) throw new Error(error);
      const { username } = cachedUser.info;
      await addChatHistory(
        `livechat:history:${process.env.SESSION_KEY}:${token}`,
        "customer",
        username,
        message,
        "location"
      );
      return res.status(201).json(req.body);
    } catch (error) {
      res.status(200).json({ error: true, message: error.message });
    }
  });
});
app.post("/handover/reply/media", (req, res) => {
  const token = req.body.token;
  const message = req.body.message;
  if (token === "undefined" || !token || token === "") {
    return res.status(200).json({
      error: true,
      message: "Token must be provided.",
    });
  }
  const cachedUser = cache.get(`${process.env.SESSION_KEY}:${token}`);
  if (!cachedUser) {
    return res.status(200).json({ error: true, message: "User not found" });
  }
  const postData = {
    account: process.env.ACCOUNT_ID,
    tenant: process.env.TENANT_ID,
    message: { message, user: { ...cachedUser.info }, token },
    action: "clientReplyMedia",
    user: { ...cachedUser.info, token },
    dateSend: date.format(new Date(), "YYYY-MM-DD HH:mm:ss"),
  };



  const options = {
    method: "POST",
    url: `${process.env.URL_MIDDLEWARE_HANDOVER}/incoming/webchat`,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  };

  request(options, async function (error, response) {
    try {
      if (error) throw new Error(error);
      const { username } = cachedUser.info;
      await addChatHistory(
        `livechat:history:${process.env.SESSION_KEY}:${token}`,
        "customer",
        username,
        message,
        "media"
      );
      return res.status(201).json(req.body);
    } catch (error) {
      res.status(200).json({ error: true, message: error.message });
    }
  });
});
// Handover API

io.attach(server);
io.adapter(redisAdapter);

async function verifyUser(token) {
  return new Promise((resolve, reject) => {
    const cachedUser = cache.get(`${process.env.SESSION_KEY}:${token}`);
    if (!cachedUser) {
      return reject("USER_NOT_FOUND");
    }
    const user = { token };
    return resolve(user);
  });
}
async function addChatHistory(key, direction, from, message, messageType) {
  console.log('addChatHistory key===>', key)
  console.log('addChatHistory direction====>', direction)
  console.log('addChatHistory from====>', from)
  console.log('addChatHistory message====>', message)
  console.log('addChatHistory messageType====>', messageType)
  const chat = await redis.getAsync(key);
  const dateSend = date.format(new Date(), "YYYY/MM/DD HH:mm:ss");
  if (chat) {
    let data = JSON.parse(chat);
    data.push({ direction, from, message, dateSend, messageType });
    data = JSON.stringify(data);
    console.log('data chat', chat)
    await redis.setAsync(key, data, "EX", 24 * 60 * 60);
    return;
  } else {
    let data = [];
    data.push({ direction, from, message, dateSend, messageType });
    data = JSON.stringify(data);
    console.log('data else====>', chat)
    await redis.setAsync(key, data, "EX", 24 * 60 * 60);
    return;
  }
}

socketAuth(io, {
  authenticate: async (socket, data, callback) => {
    const { token } = data;
    try {
      const user = await verifyUser(token);
      const canConnect = await redis.setAsync(
        `livechat:${process.env.SESSION_KEY}:${user.token}`,
        socket.id,
        "NX",
        "EX",
        86400
      );
      console.log("CAN CONNECT", canConnect)
      // if (!canConnect) {
      //   return callback({ message: "ALREADY_LOGGED_IN" });
      // }

      socket.user = user;

      return callback(null, true);
    } catch (e) {
      console.log("SOCKET AUTHENTICATION FAILED:", e)
      switch (e) {
        case "USER_NOT_FOUND":
          return callback({ message: "USER_NOT_FOUND" });

        default:
          return callback({ message: "UNAUTHORIZED" });
      }
    }
  },
  postAuthenticate: async (socket) => {
    console.log(`Socket ${socket.id} authenticated.`);

    socket.conn.on("packet", async (packet) => {
      if (socket.auth && packet.type === "ping") {
        await redis.setAsync(
          `livechat:${process.env.SESSION_KEY}:${socket.user.token}`,
          socket.id,
          "XX",
          "EX",
          86400
        );

        const socketId = await redis.getAsync(
          `livechat:${process.env.SESSION_KEY}:${socket.user.token}`
        );

        console.log('socketId======>1234', socketId)
        if (socketId === null) {
          await redis.delAsync(
            `livechat:${process.env.SESSION_KEY}:${socket.user.token}`
          );
          await redis.delAsync(
            `livechat:history:${process.env.SESSION_KEY}:${socket.user.token}`
          );
        }

      }
    });
  },
  disconnect: async (socket) => {
    console.log(`Socket ${socket.id} disconnected.`);

    // if (socket.user) {
    //   await redis.delAsync(
    //     `livechat:${process.env.SESSION_KEY}:${socket.user.token}`
    //   );
    // }
  },
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Livechat Service", process.env.URL_BASE);
  console.log("PORT", PORT);
});
