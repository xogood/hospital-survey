// Pages Functions 入口文件
// 这个文件告诉 Cloudflare 这是一个 Pages Functions 项目

export async function onRequest(context) {
  // 如果请求没有匹配到 functions/hospital/api/* 中的路由
  // 返回 404
  return new Response('Not Found', { 
    status: 404,
    headers: { 'Content-Type': 'text/plain' }
  });
}