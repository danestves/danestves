import { promises as fs } from "fs";
import fetch from "node-fetch";
import Parser from "rss-parser";

import { PLACEHOLDERS, NUMBER_OF } from "./constants.js";

const parser = new Parser();

const { YOUTUBE_API_KEY, YOUTUBE_PLAYLIST_ID, URL_RSS } = process.env;

const getLatestArticlesFromBlog = () =>
  parser.parseURL(URL_RSS).then((data) => data.items);

const getLatestYoutubeVideos = () =>
  fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${YOUTUBE_PLAYLIST_ID}&maxResults=${NUMBER_OF.VIDEOS}&key=${YOUTUBE_API_KEY}`
  )
    .then((res) => res.json())
    .then((videos) => videos.items);

const generateYoutubeHTML = ({ title, videoId }) => `
<a href='https://youtu.be/${videoId}' target='_blank'>
  <img width='30%' src='https://img.youtube.com/vi/${videoId}/mqdefault.jpg' alt='${title}' />
</a>`;

const makePromise = async () => {
  const [template, articles, videos] = await Promise.all([
    fs.readFile("./src/README.md.tpl", { encoding: "utf-8" }),
    getLatestArticlesFromBlog(),
    getLatestYoutubeVideos(),
  ]);

  // create latest articles markdown
  const latestArticlesMarkdown = articles
    .slice(0, NUMBER_OF.ARTICLES)
    .map(({ title, link }) => `- [${title}](${link})`)
    .join("\n");

  // create latest youtube videos channel
  const latestYoutubeVideos = videos
    .map(({ snippet }) => {
      const { title, resourceId } = snippet;
      const { videoId } = resourceId;
      return generateYoutubeHTML({ videoId, title });
    })
    .join("");

  // replace all placeholders with info
  const newMarkdown = template
    .replace(PLACEHOLDERS.LATEST_ARTICLES, latestArticlesMarkdown)
    .replace(PLACEHOLDERS.LATEST_YOUTUBE, latestYoutubeVideos)
    .replace(PLACEHOLDERS.IMAGES_SIZE, "28px");

  await fs.writeFile("README.md", newMarkdown);
};

makePromise();
