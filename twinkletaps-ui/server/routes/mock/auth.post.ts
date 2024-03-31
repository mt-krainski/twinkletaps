export default defineEventHandler(async event => {
  const { username, password } = await readBody(event);
  if (username === 'test-user' && password === 'local-dev') {
    appendResponseHeader(
      event,
      'set-cookie',
      'auth=local-test-cookie; path=/;'
    );
    return {
      id: 15,
      username: 'test',
      email: 'test@twinkletaps.com',
      firstName: 'Test',
      lastName: 'User',
      gender: 'female',
      image: 'https://ui-avatars.com/api/?name=Test+User&rounded=true',
      token: 'test-token',
    };
  }
  // TODO: return error response
});
