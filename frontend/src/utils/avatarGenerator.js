/**
 * avatarGenerator.js
 *
 * Thin wrapper around @dicebear/core + @dicebear/bottts that generates
 * bot-style SVG avatars entirely in the browser — no network request needed.
 *
 * Usage:
 *   import { generateBotAvatar, generateRandomBotAvatar, PRESET_BOT_SEEDS } from './avatarGenerator';
 *
 *   const dataUri = generateBotAvatar('Felix');   // always the same Felix bot
 *   const dataUri = generateRandomBotAvatar();     // brand-new random bot each call
 */

import { createAvatar } from '@dicebear/core';
import * as botttsStyle from '@dicebear/bottts';

/**
 * Fixed seeds for the 6 preset bot cells.
 * Each seed deterministically maps to one specific robot appearance.
 */
export const PRESET_BOT_SEEDS = ['Felix', 'Aiden', 'Luna', 'Oliver', 'Pixel', 'Cosmos'];

/**
 * Generate a bot avatar data URI for a given seed string.
 * The same seed always produces the exact same SVG.
 *
 * @param {string} seed - Any string (username, word, random chars, etc.)
 * @returns {string} A `data:image/svg+xml;utf8,...` data URI safe to use as <img src>
 */
export const generateBotAvatar = (seed) => {
  return createAvatar(botttsStyle, { seed }).toDataUri();
};

/**
 * Generate a bot avatar for a completely random seed.
 * Returns a new, unique robot every call.
 *
 * @returns {{ seed: string, dataUri: string }}
 *   seed    — the random seed used (stored so the avatar can be reproduced later)
 *   dataUri — the data URI for the <img src>
 */
export const generateRandomBotAvatar = () => {
  const seed = Math.random().toString(36).slice(2, 10);
  return { seed, dataUri: generateBotAvatar(seed) };
};
