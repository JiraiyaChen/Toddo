import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

function resolveBase() {
  if (!process.env.GITHUB_ACTIONS) {
    return '/';
  }

  const repository = process.env.GITHUB_REPOSITORY || '';
  const repoName = repository.split('/')[1];

  if (!repoName) {
    return '/';
  }

  return `/${repoName}/`;
}

// https://vite.dev/config/
export default defineConfig({
  base: resolveBase(),
  plugins: [vue()],
});
