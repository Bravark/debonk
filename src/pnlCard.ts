import {
  createCanvas,
  CanvasRenderingContext2D,
  loadImage,
  registerFont,
} from "canvas";
import { Stream } from "stream";
const fs = require("fs");

//install package to handle qrcode
import QRCode from "qrcode";
import { PNL_LEVELS, PNL_THRESHOLD } from "./constants";
import path from "path";

export type PNLData = {
  ticker: string;
  entryPrice: number;
  entryPriceUsd: number;
  exitPrice: number;
  exitPriceUsd: number;
  amountBought: number;
  pnlPercentage: number;
  x: number;
  isProfit: boolean;
  totalTimeTaken: string;
  userRefCode: string;
};

// Function to generate PNL card as a Canvas stream (in memory)
export async function generatePNLCard(pnlData: PNLData) {
  const marginLeft = 30;
  const width = 700;
  const height = 486;
  const fontStyle = "Arial";
  const fontStyle2 = "Times New Roman";
  const canvas = createCanvas(width, height);
  const ctx: CanvasRenderingContext2D = canvas.getContext("2d");
  //we will get the background image based on the pnl percentage
  let backgroundImagePath: string;

  if (pnlData.pnlPercentage > PNL_THRESHOLD) {
    //pick and string in the PNL_LEVELS.PROFIT_HIGH array

    backgroundImagePath =
      PNL_LEVELS.PROFIT_HIGH[
        Math.floor(Math.random() * PNL_LEVELS.PROFIT_HIGH.length)
      ];
  } else if (
    pnlData.pnlPercentage >= 0 &&
    pnlData.pnlPercentage <= PNL_THRESHOLD
  ) {
    backgroundImagePath =
      PNL_LEVELS.PROFIT_LOW[
        Math.floor(Math.random() * PNL_LEVELS.PROFIT_LOW.length)
      ];
  } else if (
    pnlData.pnlPercentage >= PNL_THRESHOLD * -1 &&
    pnlData.pnlPercentage < 0
  ) {
    backgroundImagePath =
      PNL_LEVELS.LOSS_LOW[
        Math.floor(Math.random() * PNL_LEVELS.LOSS_LOW.length)
      ];
  } else if (pnlData.pnlPercentage < PNL_THRESHOLD * -1) {
    backgroundImagePath =
      PNL_LEVELS.LOSS_HIGH[
        Math.floor(Math.random() * PNL_LEVELS.LOSS_HIGH.length)
      ];
  }
  console.log("backgroundImagePath: ", backgroundImagePath);

  const backgroundImagePathx = path.resolve(
    __dirname,
    `../public/pnl-images/${backgroundImagePath}`
  );
  const backgroundImg = await loadImage(backgroundImagePathx);
  const debonkLogoPath = path.resolve(__dirname, "../public/debonklogo.png");
  const debonkLogo = await loadImage(debonkLogoPath);

  // Calculate aspect ratio and position for proper scaling
  const imgAspectRatio = backgroundImg.width / backgroundImg.height;
  const canvasAspectRatio = width / height;

  let renderWidth, renderHeight, xOffset, yOffset;

  if (canvasAspectRatio > imgAspectRatio) {
    // Canvas is wider relative to height than the image
    renderHeight = height;
    renderWidth = height * imgAspectRatio;
    xOffset = (width - renderWidth) / 2; // Center horizontally
    yOffset = 0;
  } else {
    // Image is wider relative to height than the canvas
    renderWidth = width;
    renderHeight = width / imgAspectRatio;
    xOffset = 0;
    yOffset = (height - renderHeight) / 2; // Center vertically
  }

  // Background color fill (in case the image doesn't cover the whole canvas)
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, width, height);

  // Draw the background image with proper scaling and centering
  ctx.drawImage(backgroundImg, xOffset, yOffset, renderWidth, renderHeight);

  // // Title
  // ctx.fillStyle = "#333";
  // ctx.font = "bold 24px Finland";
  // ctx.fillText("PNL Summary", 180, 50);
  //DRAW DEBONK LOGO
  ctx.drawImage(debonkLogo, marginLeft, 10, 100, 35);

  // TICKER
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `18px ${fontStyle}`;
  ctx.font = `25px ${fontStyle}`;
  ctx.fillText(`${pnlData.ticker}/SOL`, marginLeft, 100);

  // P | L
  ctx.font = `bold 18px ${fontStyle}`;
  ctx.font = `80px ${fontStyle}`;
  const pnlColor = pnlData.isProfit ? "#1DD75B" : "#FF0000"; // Green for profit, Red for loss
  ctx.fillStyle = pnlColor;
  ctx.fillText(
    `${pnlData.isProfit ? "+" : ""}${pnlData.pnlPercentage}%`,
    marginLeft,
    190
  );

  //time and x
  const fontSize = 18;
  ctx.font = `${fontSize}px ${fontStyle}`;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillStyle = pnlColor;
  ctx.fillText(`${pnlData.x.toFixed(2)}x`, marginLeft, 240);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(`${pnlData.totalTimeTaken}`, marginLeft + 80, 240);

  // Position Details
  ctx.font = `italics 22px ${fontStyle2}`;
  ctx.fillText("Invested", marginLeft, 280);
  ctx.font = `bold 20px ${fontStyle}`;
  ctx.fillText(
    `${(pnlData.entryPrice * pnlData.amountBought).toFixed(3)} SOL`,
    marginLeft,
    305
  );
  ctx.font = `15px ${fontStyle}`;
  ctx.fillStyle = "#FFFFFFAA";
  ctx.fillText(
    `$${(pnlData.entryPriceUsd * pnlData.amountBought).toFixed(3)}`,
    marginLeft,
    325
  );

  ctx.fillStyle = pnlColor;
  ctx.font = `italics 22px ${fontStyle2}`;
  ctx.fillText("Current  Gain", marginLeft + 120, 280);
  ctx.font = `bold 20px ${fontStyle}`;
  ctx.fillText(
    `${(pnlData.exitPrice * pnlData.amountBought).toFixed(6)} SOL`,
    marginLeft + 120,
    305
  );
  ctx.font = `15px ${fontStyle}`;
  ctx.fillStyle = "#FFFFFFAA";
  ctx.fillText(
    `$${(pnlData.exitPriceUsd * pnlData.amountBought).toFixed(6)}`,
    marginLeft + 120,
    325
  );

  //QR code and text
  const QRSting = await generateQR(pnlData.userRefCode);
  const image = await loadImage(QRSting);
  ctx.drawImage(image, marginLeft, 350, 100, 100);
  const text1 = "Get Snipping Bot on Telegram";
  const text2 = "With ANTI-RUG feature";
  const text3 = "@demichy";
  ctx.font = `18px ${fontStyle}`;
  ctx.fillStyle = "#FFF";
  ctx.fillText(text1, marginLeft + 120, 370);
  ctx.fillText(text2, marginLeft + 120, 400);
  ctx.fillText(text3, marginLeft + 120, 430);

  const buffer = canvas.toBuffer("image/png");
  const write = path.resolve(__dirname, "./pnl.jpeg");
  fs.writeFileSync(write, buffer);

  return buffer;
  // Return the Canvas stream (in-memory)
  // return canvas.createPNGStream();
}

// With async/await
const generateQR = async (text: string) => {
  try {
    return await QRCode.toBuffer(text);
  } catch (err) {
    console.error(err);
  }
};
