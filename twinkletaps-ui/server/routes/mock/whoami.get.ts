export default defineEventHandler(event => {
  const cookies = parseCookies(event);
  if ('auth' in cookies && cookies.auth === 'local-test-cookie') {
    setResponseStatus(event, 200);
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
  } else {
    setResponseStatus(event, 403);
  }
});
