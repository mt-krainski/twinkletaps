export default defineEventHandler(event => {
  const cookies = parseCookies(event);
  if ('auth' in cookies && cookies.auth === 'local-test-cookie') {
    appendResponseHeader(
      event,
      'set-cookie',
      'auth=deleted; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    );
    return;
  } else {
    setResponseStatus(event, 403);
  }
});
