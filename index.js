const express = require("express");
const app = express();
const util = require("util");
const port = 3000;
const cors = require("cors");
const dotenv = require("dotenv").config();
const Cloud = require("@google-cloud/storage");
const path = require("path");
const uuid = require("uuid").v4;

const imageCache = [];

const serviceKey = path.join(
  __dirname,
  "/assets/skin-science-368104-1f85e2c6ef1e.json"
);
const bodyParser = require("body-parser");

// const multer = require("multer");

// Imports the Google Cloud AutoML library
const { PredictionServiceClient } = require("@google-cloud/automl").v1;
const fs = require("fs");
const projectId = "skin-science-368104";
const location = "us-central1";
const modelId = "ICN8118284785614323712";

const { Storage } = Cloud;
const storage = new Storage({
  keyFilename: serviceKey,
  projectId: projectId,
});

// const multerMid = multer({
//   storage: multer.memoryStorage(),
//   limits: {
//     fileSize: 5 * 1024 * 1024,
//   },
// });

app.disable("x-powered-by");
// app.use(multerMid.single("file"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const bucket = storage.bucket("scanned_images");

// Instantiates a client
const client = new PredictionServiceClient();

app.use(express.json());

app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/scan", async (req, res) => {
  const fileBuffer = req.body.file;
  try {
    const imageUrl = await uploadImage({
      originalname: uuid(),
      buffer: fileBuffer,
    });
    imageCache.push({imageUrl});
  } catch (error) {
    res.status(400).json({
      message: "Upload was unsuccessful",
      error,
    });
  }
  try {
    const prediction = await predict(fileBuffer);
    res.status(200).json({
        data: prediction,
    });
  } catch(error) {
    setTimeout(() => {
      res.send({})
    }, 4000);
    // res.status(400).json({
    //     message: "Prediction was unsuccessful",
    //     error,
    // });
  }
 
});

app.get("/recommendation", (req, res) => {
    res.send({});
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

async function predict(content) {
  const request = {
    name: client.modelPath(projectId, location, modelId),
    payload: {
      image: {
        imageBytes: content,

      },
    },
  };

  const [response] = await client.predict(request);
  const returnValues = [];
  for (const annotationPayload of response.payload) {
    console.log(`Predicted class name: ${annotationPayload.displayName}`);
    console.log(
      `Predicted class score: ${annotationPayload.classification.score}`
    );
    returnValues.push({displayName: annotationPayload.displayName, score: nPayload.classification.score})
  }
  return returnValues;
}

const uploadImage = (file) =>
  new Promise((resolve, reject) => {
    const { originalname, buffer } = file;
    const blob = bucket.file(originalname.replace(/ /g, "_"));
    const blobStream = blob.createWriteStream({
      resumable: false,
    });
    blobStream
      .on("finish", () => {
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
        resolve(publicUrl);
      })
      .on("error", (e) => {
        reject(`Unable to upload image, something went wrong`);
      })
      .end(buffer);
  });