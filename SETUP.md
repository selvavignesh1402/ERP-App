# Frontend setup

Install the locked dependencies from this directory with `npm ci`. The Expo 52 dependency manifest expects `expo-secure-store ~14.0.1` and `react-native 0.76.9`; keep the manifest and package-lock.json together when updating dependencies. Restart Metro after installation and rebuild a custom native development client when its native dependencies change.

Copy `.env.example` to `.env` and configure the backend address reachable from your browser, emulator or phone. A blank EXPO_PUBLIC_API_URL uses development defaults; production requires the real backend URL at build/export time. Start development with `npm start`, or `npm run web` for the browser.

For the existing Firebase phone-login integration, set EXPO_PUBLIC_FIREBASE_API_KEY to your Firebase project's public web API key. The source module is included in the repository and requires no private file to compile. With the key missing, Firebase calls report a configuration error before making a request; the existing login fallback behavior is unchanged. The local `.env` file is ignored by Git. Expo embeds EXPO_PUBLIC values in the bundle, so never put service-account JSON or private keys there. Restart Metro after changing `.env` and rebuild/export production apps after changing build-time values.

The client module uses Axios REST requests, so it does not require the Firebase JavaScript SDK package. Enable Firebase Admin on the backend using the instructions in `../ERP-APP-Backend/FIREBASE_SETUP.md`. Both ends must use the same Firebase project. These setup changes do not repair or change the OTP flow; phone authentication still depends on the project's existing Firebase provider and app-verification setup.

Run `npm run lint:hooks`, `node --test tests/*.test.cjs` and `npx --no-install tsc --noEmit` for the frontend checks. Hook lint scans all app and shared TypeScript files for invalid React hook placement. These checks were verified with Node 24.13.1; the locked ESLint tooling requires a compatible modern Node runtime. Dependency installation and these checks do not prove that SMS delivery, live Firebase credentials or a physical-device login work.
