import axios from 'axios';

const request = axios.create({
  baseURL:'https://shopdienthoai-nine.vercel.app/',
  timeout: 10000,
});
export const requestInitial = async (options) => {
    const  res = await request(options)
    return res.data
}