# Pokémon TCG Deck Builder

Welcome to the Pokémon TCG Deck Builder! This application helps you create, manage, and export your Pokémon TCG decklists with ease.

## Features

* **Deck Creation:** Build decks by searching for official Pokémon TCG cards.
* **Custom Cards:** Add your own custom cards with direct image URLs.
* **Import/Export:**
    * Export your decklists to CSV format, compatible with popular simulators like PTCG Live and Tabletop Simulator.
    * Import existing decklists from CSV files.
* **Image Handling:** Supports official card images, direct URLs for custom cards, and provides fallbacks for missing images.
* **Theme Toggle:** Switch between light and dark modes for comfortable viewing.
* **Responsive Design:** Works across different screen sizes.

## Recent Changes (v1.2.0)

This version brings significant improvements to custom card handling, deck import/export, and data storage.

**Key Highlights:**

* **Revamped Custom Card System:** Custom cards now use direct image URLs, eliminating previous storage issues and simplifying the creation process.
* **Optimized Deck Export:** CSV exports are now more compact and reliable, using direct image URLs.
* **Improved Data Management:** Storage requirements for custom cards have been drastically reduced.

**For a detailed list of changes, please click the version badge (e.g., `v1.2.0`) in the application header.**

## Getting Started (Example)

1.  **Clone the repository (if applicable):**
    ```bash
    git clone <your-repository-url>
    cd pokemon-tcg-deck-builder
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```
3.  **Set up API Key (Optional but Recommended):**
    Create a `.env` file in the root of your project and add your Pokémon TCG API key:
    ```env
    REACT_APP_POKEMON_TCG_API_KEY=your_api_key_here
    ```
    An API key (`a65acbfc-55e5-4d2c-9278-253872a1bc5a`) is provided by default for basic functionality if you don't have your own.
4.  **Run the application:**
    ```bash
    npm start
    # or
    yarn start
    # or
    pnpm start
    ```

## Custom Card Image URLs

When creating custom cards, you'll need to provide a direct URL to an image. This means the URL should point directly to the image file itself (e.g., ending in `.png`, `.jpg`, `.gif`).

* **Recommended Hosts:** Imgur, ImgBB, or any hosting service that provides stable, direct image links.
* **Google Drive:** Standard Google Drive sharing links (e.g., `drive.google.com/file/d/.../view`) are **not** direct image links and will not work. Your application will attempt to convert these to a viewable format for display within the app if used, but for best compatibility, use direct image links.
* **Website Links:** If you are hosting images on your own website, ensure the links are direct paths to the image files.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## License

This project is licensed under the MIT License (or your chosen license).
