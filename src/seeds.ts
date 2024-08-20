/* eslint-disable @typescript-eslint/no-explicit-any */
import dotenv from 'dotenv';
import { faker } from '@faker-js/faker';
import { floor, random } from 'lodash';
import axios from 'axios';
import Jimp from 'jimp';
// import { createCanvas } from 'canvas';

dotenv.config({});

function avatarColor(): string {
  const colors: string[] = [
    '#f44336',
    '#e91e63',
    '#2196f3',
    '#9c27b0',
    '#3f51b5',
    '#00bcd4',
    '#4caf50',
    '#ff9800',
    '#8bc34a',
    '#009688',
    '#03a9f4',
    '#cddc39',
    '#2962ff',
    '#448aff',
    '#84ffff',
    '#00e676',
    '#43a047',
    '#d32f2f',
    '#ff1744',
    '#ad1457',
    '#6a1b9a',
    '#1a237e',
    '#1de9b6',
    '#d84315'
  ];
  return colors[floor(random(0.9) * colors.length)];
}

async function generateAvatar(text: string, backgroundColor: string, foregroundColor = 'white') {
  // const canvas = createCanvas(200, 200);
  // const context = canvas.getContext('2d');

  // context.fillStyle = backgroundColor;
  // context.fillRect(0, 0, canvas.width, canvas.height);

  // context.font = 'normal 80px sans-serif';
  // context.fillStyle = foregroundColor;
  // context.textAlign = 'center';
  // context.textBaseline = 'middle';
  // context.fillText(text, canvas.width / 2, canvas.height / 2);

  // return canvas.toDataURL('image/png');

  // Create a new image with Jimp
  const image = new Jimp(200, 200, backgroundColor);

  // Load the font for the text
  const font = await Jimp.loadFont(foregroundColor === 'white' ? Jimp.FONT_SANS_64_WHITE : Jimp.FONT_SANS_64_BLACK);

  // Calculate text positioning
  const textWidth = Jimp.measureText(font, text);
  const textHeight = Jimp.measureTextHeight(font, text, 200);

  const x = (image.bitmap.width - textWidth) / 2;
  const y = (image.bitmap.height - textHeight) / 2;

  // Print the text onto the image
  image.print(font, x, y, text);

  // Convert the image to a base64-encoded PNG data URL
  const base64: string = await image.getBase64Async(Jimp.MIME_PNG);

  return base64;
}

async function seedUserData(count: number): Promise<void> {
  let i = 0;
  try {
    for (i = 0; i < count; i++) {
      const username: string = faker.unique(faker.word.adjective, [8]);
      const color = avatarColor();
      // Await the avatar generation
      const avatar = await generateAvatar(username.charAt(0).toUpperCase(), color);

      const body = {
        username,
        email: faker.internet.email(),
        password: 'qwerty',
        avatarColor: color,
        avatarImage: avatar // This is now correctly awaited and should be a string
      };

      console.log(`***ADDING USER TO DATABASE*** - ${i + 1} of ${count} - ${username}`);
      await axios.post(`${process.env.API_URL}/signup`, body);
    }
  } catch (error: any) {
    console.log(error?.response?.data);
  }
}

seedUserData(10);
