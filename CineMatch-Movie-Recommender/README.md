# CineMatch — Real-Time Movie Recommendation Website

A polished, interview-ready movie recommendation frontend powered by the TMDB API.

## Features

- Real-time trending movies
- Movie search
- Genre/rating/release-period filters
- Mood-based recommendations
- Transparent "Smart Match" scoring
- "Why was this recommended?" explanation
- Movie detail modal
- Persistent watchlist using localStorage
- Responsive dark UI
- Works as a static site / GitHub Pages project

## Run locally

Open `index.html` with VS Code Live Server, or simply open it in a browser.

On first load, click the API connection prompt and paste your **TMDB API Read Access Token**.

The token is stored only in your browser's localStorage for this demo.

## TMDB setup

Create/sign in to a TMDB account and obtain an API Read Access Token from your account API settings. The frontend sends it as a Bearer token.

Official documentation:
https://developer.themoviedb.org/docs/getting-started

## GitHub Pages

Push the three files to GitHub, then enable:
Settings → Pages → Deploy from branch → `main` → `/ (root)`

Your site will then be available through your GitHub Pages URL.

## Important security note

This project is intentionally a static frontend for easy interview demonstration. A browser-side token can be inspected by users. For production, move TMDB calls behind your own backend/serverless function and keep secrets server-side.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.
