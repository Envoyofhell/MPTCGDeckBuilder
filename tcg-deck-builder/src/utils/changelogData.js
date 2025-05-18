// src/utils/changelogData.js

/**
 * Changelog data for the Pokémon TCG Deck Builder.
 * Each object in the array represents a version.
 * The 'version' property is the version number.
 * The 'date' property is the release date (optional).
 * The 'changes' property is an array of categories, each with a 'title' and 'items' (array of strings).
 */
const changelogData = [
    {
        version: "1.2.0",
        date: "2025-05-17", // Example date, update as needed
        changes: [
            {
                title: "Major Changes",
                items: [
                    "**Custom Card Creation System:**",
                    "CHANGED: Replaced image upload with direct URL input for custom cards, simplifying the process and improving reliability.",
                    "FIXED: Resolved storage quota errors previously encountered when creating multiple custom cards by storing only image URLs.",
                    "ADDED: Image preview for direct URLs during custom card creation, with error validation to ensure link viability.",
                    "IMPROVED: Enhanced compatibility with deck importers like PTCG Live and TCG Simulator by using standardized direct image URLs.",
                    "**Deck Import/Export System:**",
                    "FIXED: CSV exports now consistently use direct image URLs instead of `data:image` strings, ensuring better compatibility and smaller file sizes.",
                    "IMPROVED: Exported CSV files are now significantly smaller due to the removal of embedded image data.",
                    "ADDED: Default placeholder images are now used for different card types (Pokémon, Trainer, Energy) if a custom card's URL is invalid or missing during export.",
                    "FIXED: Importing and exporting Trainer and Energy cards now works more reliably with accurate type and image handling.",
                    "**Data Storage Optimizations:**",
                    "REDUCED: Storage requirements for custom cards have been reduced by over 90% by storing image URLs instead of base64 encoded images.",
                    "ADDED: Automatic cleanup of the oldest custom cards when the maximum storage limit (currently 50 cards) is reached, preventing browser storage quota errors.",
                    "FIXED: Eliminated browser storage quota errors that could occur when saving a large number of custom cards.",
                ],
            },
            {
                title: "Technical Improvements",
                items: [
                    "**Enhanced TCG Controller (`src/utils/TCGapi/EnhancedTCGController.js`):**",
                    "Version upgraded to 1.4.0.",
                    "REMOVED: Complex client-side image processing and compression for custom cards.",
                    "ADDED: Direct URL storage mechanism for custom card images.",
                    "IMPROVED: Error handling for storage limits and automatic cleanup of old custom card data.",
                    "**Custom Card Creator (`src/components/modals/CustomCardCreator.js`):**",
                    "REPLACED: File upload input with a direct URL input field for card images.",
                    "ADDED: URL validation with visual feedback (e.g., success/error indicators) for the image link.",
                    "ADDED: Live image preview directly from the provided URL within the creator modal.",
                    "IMPROVED: Form validation and error handling for a smoother user experience.",
                    "ADDED: Help text guiding users on compatible image hosts and URL types.",
                    "**TCG Sim Controller (`src/utils/TCGsim/TCGSimController.js`):**",
                    "ADDED: Enhanced export-friendly URL formatting. It now intelligently handles various URL types, including attempts to make Google Drive links viewable for export (though direct links are still preferred).",
                    "ADDED: Robust placeholder images for different card types (Pokémon, Trainer, Energy) during export if an image URL is problematic.",
                    "IMPROVED: CSV formatting (quoting fields) for better compatibility with a wider range of spreadsheet programs and simulators.",
                    "ENHANCED: Error handling for malformed input during CSV import and export processes.",
                ],
            },
            {
                title: "Compatibility Notes",
                items: [
                    "Direct image URLs (e.g., ending in `.png`, `.jpg`) must be used for custom cards for full compatibility, especially with external tools. These can be hosted on services like Imgur, ImgBB, or your own web server.",
                    "While the application attempts to process Google Drive viewing page links for in-app display and export, they are not guaranteed to work reliably with all external simulators. Direct image links are strongly recommended.",
                    "Existing custom cards created with `data:` URLs (from previous versions) will still display correctly within the application but will be exported using placeholder images to ensure compatibility and small file sizes.",
                ],
            },
            {
                title: "Known Issues",
                items: [
                    "Google Drive or similar viewing page links (e.g., `drive.google.com/file/d/.../view`) might not render correctly in all external tools or simulators even after transformation. Always prefer direct image URLs.",
                    "Only permanent, publicly accessible direct image URLs ending with common image file extensions (e.g., `.jpg`, `.png`, `.gif`) are guaranteed to be fully compatible for custom cards, especially for third-party tools.",
                    "Image URLs must be publicly accessible and not require any login or special permissions to view.",
                ],
            },
            {
                title: "Summary",
                items: [
                    "This update significantly improves the reliability and usability of custom cards, enhances compatibility with external deck importers/simulators, and resolves critical storage limitations, leading to a much smoother user experience.",
                ]
            }
        ],
    },
    {
        version: "1.1.0", // Previous version example
        date: "2025-04-15", // Example date
        changes: [
            {
                title: "What's New",
                items: ["The ability to toggle between JP and English card proxies now available. Note, some cards will not have english proxies. Proxies are taken from JustInBasil."],
            },
            {
                title: "Bug Fixes",
                items: ["Fixed Issue where cards imported with type \"Pokemon\" (instead of \"Pokémon\") failed to import."],
            },
            {
                title: "Supported Prereleased Sets",
                items: ["Twilight Masquerade", "Temporal Forces (logo only shown as example)"],
            }
        ]
    }
    // Add more version objects here as you release new updates
];

export const latestVersion = changelogData[0]; // Assumes the first entry is the latest

export default changelogData;
