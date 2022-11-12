const express = require("express");
const app = express();
const util = require("util");
const port = 3000;
const cors = require("cors");
const dotenv = require("dotenv").config();
const Cloud = require("@google-cloud/storage");
const path = require("path");
const uuid = require("uuid").v4;

const connection = require("./database");

console.log(connection);

const serviceKey = path.join(
  __dirname,
  "/assets/skin-science-368104-1f85e2c6ef1e.json"
);
const bodyParser = require("body-parser");

const multer = require("multer");

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

const multerMid = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

app.disable("x-powered-by");
app.use(multerMid.single("file"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const filePath = __dirname + "\\assets\\1.jpg";

const bucket = storage.bucket("scanned_images");

// Instantiates a client
const client = new PredictionServiceClient();

app.use(express.json());

app.use(cors());

app.post("/scan", (req, res) => {
  // const rand = Math.random() * 10000 + 5000;

  const fileBuffer = req.body.file;
  xuploadImage(req, res);
  predict();
  // setTimeout(() => {
  //     res.send({products: []});
  // }, rand);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

async function predict() {
  // Read the file content for translation.
  const content = fs.readFileSync(filePath);
  // Construct request
  // params is additional domain-specific parameters.
  // score_threshold is used to filter the result
  const request = {
    name: client.modelPath(projectId, location, modelId),
    payload: {
      image: {
        imageBytes: content,
      },
    },
  };

  const [response] = await client.predict(request);
  console.log(response);
  for (const annotationPayload of response.payload) {
    console.log(`Predicted class name: ${annotationPayload.displayName}`);
    console.log(
      `Predicted class score: ${annotationPayload.classification.score}`
    );
  }
}

const uploadImage = (file) =>
  new Promise((resolve, reject) => {
    const { originalname, buffer } = file;

    console.log(file);

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
        console.log(e);
        reject(`Unable to upload image, something went wrong`);
      })
      .end(buffer);
  });

const xuploadImage = async (req, res) => {
  {
    try {
      const fileBuffer = req.body.file;
      const imageUrl = await uploadImage({
        originalname: uuid(),
        buffer: fileBuffer,
      });
      res.status(200).json({
        message: "Upload was successful",
        data: imageUrl,
      });
    } catch (error) {
      console.log(error);
      res.send({ message: "error" });
    }
  }
};

function checkDB() {
  connection.query(
    "SELECT * FROM `skinscience`",
    function (error, results, fields) {
      if (error) throw error;
      res.json(results);
    }
  );
}

//checkDB();
