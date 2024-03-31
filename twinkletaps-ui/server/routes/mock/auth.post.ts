import axios, { isAxiosError } from 'axios';

export default defineEventHandler(async event => {
  const { username, password } = await readBody(event);
  if (username === 'test-user' && password === 'local-dev')
    return {
      id: 15,
      username: 'kminchelle',
      email: 'kminchelle@qq.com',
      firstName: 'Jeanne',
      lastName: 'Halvorson',
      gender: 'female',
      image: 'https://robohash.org/Jeanne.png?set=set4',
      token:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTUsInVzZXJuYW1lIjoia21pbmNoZWxsZSIsImVtYWlsIjoia21pbmNoZWxsZUBxcS5jb20iLCJmaXJzdE5hbWUiOiJKZWFubmUiLCJsYXN0TmFtZSI6IkhhbHZvcnNvbiIsImdlbmRlciI6ImZlbWFsZSIsImltYWdlIjoiaHR0cHM6Ly9yb2JvaGFzaC5vcmcvSmVhbm5lLnBuZz9zZXQ9c2V0NCIsImlhdCI6MTcxMTkxNzYyNiwiZXhwIjoxNzExOTIxMjI2fQ.2RONCc7fq36H5OLPQwZQuVLNltxQgRQY75uSCEPAmII',
    };
  // TODO: return error response
});
