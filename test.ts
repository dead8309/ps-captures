import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const TOKEN = process.env.PSN_TOKEN;
if (!TOKEN) throw new Error("❌ Missing PSN_TOKEN in environment variables");

const BASE_URL =
  "https://m.np.playstation.com/api/gameMediaService/v2/c2s/category/cloudMediaGallery/ugcType/all?includeTokenizedUrls=true&limit=100";

async function getCaptures() {
  console.log("📡 Fetching captures list...");
  const res = await fetch(BASE_URL, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch captures: ${res.status} ${res.statusText}`,
    );
  }

  // Extract all CloudFront cookies from headers
  const rawCookies = res.headers.raw()["set-cookie"] || [];
  const cloudfrontCookies = rawCookies
    .filter((c) => c.startsWith("CloudFront"))
    .map((c) => c.split(";")[0])
    .join("; ");

  const data = await res.json();
  console.log(`✅ Found ${data.ugcDocument.length} captures on the first page`);

  return { captures: data.ugcDocument, cookies: cloudfrontCookies };
}

async function downloadCapture(capture: any, cookies: string) {
  const fileName =
    capture.title.replace(/[^\w\d-_]+/g, "_") +
    (capture.fileType ? `.${capture.fileType.toLowerCase()}` : ".mp4");

  const filePath = path.join("captures", fileName);
  fs.mkdirSync("captures", { recursive: true });

  console.log(`⬇️  Downloading: ${fileName}`);

  const res = await fetch(capture.downloadUrl, {
    headers: {
      Cookie: cookies,
    },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to download ${fileName}: ${res.status} ${res.statusText}`,
    );
  }

  const fileStream = fs.createWriteStream(filePath);
  await new Promise<void>((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });

  console.log(`✅ Saved to ${filePath}`);
}

(async () => {
  try {
    const { captures, cookies } = await getCaptures();
    if (!captures.length) {
      console.log("❌ No captures found");
      return;
    }
    console.log(captures)

    // const firstCapture = captures[0];
    // console.log(
    //   `🎬 First capture: ${firstCapture.title} (${firstCapture.fileType})`,
    // );
    //
    // await downloadCapture(firstCapture, cookies);
  } catch (err) {
    console.error("❌ Error:", err);
  }
})();
