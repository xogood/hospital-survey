export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'GET') {
    return new Response('仅支持 GET', { status: 405 });
  }

  const url = new URL(request.url);
  const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return new Response('月份格式错误', { status: 400 });
  }

  try {
    const stmt = env.DB.prepare(
      `SELECT id, * FROM satisfaction_records WHERE month = ? ORDER BY id ASC`
    );
    const { results } = await stmt.bind(month).all();

    // 定义 CSV 列头
    const headers = [
      '序号',
      '调查日期',
      '患者姓名',
      '就诊科室',
      '导诊/体检接待服务态度及效率',
      '接诊医生服务态度和沟通',
      '检验',
      '放射',
      '超声',
      '心电图',
      '神经电生物室',
      '药房服务态度和用药指导',
      '收费员服务态度及效率',
      '其它',
      '是否有收受红包情况',
      '备注'
    ];

    // 构建 CSV 内容
    let csvContent = '\uFEFF' + headers.join(',') + '\n';

    results.forEach((row, index) => {
      const line = headers.map(col => {
        let val;
        if (col === '序号') {
          val = index + 1; // 从1开始编号
        } else {
          val = row[col];
        }
        if (val === null || val === undefined) val = '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          val = '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
      }).join(',');
      csvContent += line + '\n';
    });

    const fileName = `患者满意度调查_${month}.csv`;
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    console.error(err);
    return new Response('下载失败', { status: 500 });
  }
}
