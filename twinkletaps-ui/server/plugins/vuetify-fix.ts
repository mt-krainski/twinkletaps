// Temporary fix to issue with Vuetify paths
// https://github.com/nuxt/nuxt/issues/15412#issuecomment-1398110500
export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('render:response', response => {
    response.body = response.body.replaceAll('/_nuxt/\0', '/_nuxt/');
  });
});
