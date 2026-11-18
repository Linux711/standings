
const CARD_COLUMNS = [
    ["IG", "IH", "IK"],
    ["IL", "IO", "IP"],
    ["IS", "IT", "IW"]
];

let cardMap = {};


/**
 * Load ID → card name mappings from chars.csv
 */
async function loadCardMapping() {
    const response = await fetch("chars.csv");

    if (!response.ok) {
        throw new Error("Failed to load chars.csv");
    }

    const csv = await response.text();

    csv.split(/\r?\n/).forEach(line => {
        if (!line.trim()) return;

        const columns = line.split(",");

        if (columns.length >= 2) {
            const id = parseInt(columns[0].trim(), 10);
            const name = columns[1].trim();

            if (!isNaN(id)) {
                cardMap[id] = name;
            }
        }
    });
}


/**
 * Convert an Excel column name to its 1-based number.
 */
function excelColumnNumber(column) {
    let result = 0;

    for (const char of column.toUpperCase()) {
        result =
            result * 26 +
            (char.charCodeAt(0) - "A".charCodeAt(0) + 1);
    }

    return result;
}


/**
 * Get the zero-based position relative to IG.
 */
function excelColumnOffset(column) {
    return (
        excelColumnNumber(column) -
        excelColumnNumber("IG")
    );
}


/**
 * Convert Base64 deck code into hexadecimal,
 * then reverse the byte offset.
 */
function base64ToHexStream(base64String) {
    const binary = atob(base64String);

    let hex = "";

    for (let i = 0; i < binary.length; i++) {
        hex += binary
            .charCodeAt(i)
            .toString(16)
            .padStart(2, "0");
    }

    hex = hex.toUpperCase();

    // Valid deck codes contain 51 bytes (102 hex characters).
    if (hex.length !== 102) {
        throw new Error("Invalid deck code length");
    }

    // The final byte stores the offset.
    const offset = parseInt(hex.slice(-2), 16);

    // Reverse the offset applied during encoding.
    let correctedHex = "";

    for (let i = 0; i < hex.length; i += 2) {
        let byte = parseInt(hex.slice(i, i + 2), 16);

        byte = (byte - offset + 256) % 256;

        correctedHex += byte
            .toString(16)
            .padStart(2, "0");
    }

    return correctedHex.toUpperCase();
}


/**
 * Extract a card ID using the scrambling positions.
 */
function extractCardId(hexStream, columns) {
    const positions = columns.map(column => {
        let position = excelColumnOffset(column);

        // Same wraparound behavior as the original Python version.
        position =
            ((position % hexStream.length) +
                hexStream.length) %
            hexStream.length;

        return position;
    });

    const hexDigits = positions
        .map(position => hexStream[position])
        .join("");

    return parseInt(hexDigits, 16);
}


/**
 * Decode the deck and return ONLY the 3 character names.
 */
async function decodeCharacters(deckCode) {

    // Load chars.csv if it hasn't been loaded yet.
    if (Object.keys(cardMap).length === 0) {
        await loadCardMapping();
    }

    // Convert Base64 and reverse the offset.
    const hexStream = base64ToHexStream(deckCode);

    const characters = [];

    for (const columns of CARD_COLUMNS) {

        const cardId = extractCardId(
            hexStream,
            columns
        );

        const cardName =
            cardMap[cardId] ||
            `Unknown (${cardId})`;

        characters.push(cardName);
    }

    return characters;
}
