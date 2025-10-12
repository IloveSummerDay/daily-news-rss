import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { chromium } from 'playwright'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🧪 单篇PDF生成测试脚本')
console.log('='.repeat(50))

// 检查数据文件
let firstArticle
try {
	const jsonPath = join(__dirname, '../data/latest-raw.json')
	const jsonData = readFileSync(jsonPath, 'utf8')
	const data = JSON.parse(jsonData)

	console.log(`📖 找到 ${data.articles.length} 篇文章`)
	console.log(`📅 数据更新时间: ${data.crawledAt}`)

	if (data.articles.length > 0) {
		firstArticle = data.articles[0]
		console.log(`\n📰 将生成第一篇文章的PDF:`)
		console.log(`   标题: ${firstArticle.title}`)
		console.log(`   作者: ${firstArticle.author}`)
		console.log(`   发布日期: ${firstArticle.pubDate}`)
		console.log(`   源域名: ${firstArticle.source_domain}`)
	} else {
		console.error('❌ 没有找到文章数据')
		process.exit(1)
	}
} catch (error) {
	console.error('❌ 无法读取数据文件:', error.message)
	process.exit(1)
}

// 导入必要的函数
import { generateHtmlContent } from '../scripts/html-to-pdf.js'

console.log('\n🚀 开始生成单篇PDF...')
console.log('⏳ 请稍等...')

// 记录开始时间
const startTime = new Date()
console.log(`⏰ 开始时间: ${startTime.toLocaleString()}`)

async function generateSinglePDF() {
	try {
		console.log('[1/4] 启动浏览器...')
		const browser = await chromium.launch({ headless: true })
		const page = await browser.newPage()

		console.log('[2/4] 生成HTML内容...')
		const htmlContent = generateHtmlContent(firstArticle)
		console.log(`   HTML内容长度: ${htmlContent.length} 字符`)

		console.log('[3/4] 加载HTML到浏览器...')
		await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' })

		// 等待CSS和图片加载
		console.log('[4/4] 等待资源加载...')
		await page.waitForTimeout(2000) // 等待2秒确保所有资源加载

		// 生成PDF文件名
		const urlObj = new URL(firstArticle.url)
		const filename = urlObj.pathname.split('/').pop() || 'page'
		const cleanFilename = filename.replace(/[^a-zA-Z0-9\-_]/g, '_')

		// 创建输出目录
		const outputDir = join(__dirname, '..', 'pdfs')
		const sourceDomain = firstArticle.source_domain || 'unknown'
		const now = new Date()
		const dateStr = now.toISOString().slice(0, 10)
		const pdfDir = join(outputDir, sourceDomain, dateStr)

		const { mkdir } = await import('fs/promises')
		await mkdir(pdfDir, { recursive: true })

		const pdfPath = join(pdfDir, `${cleanFilename}.pdf`)

		console.log('[5/5] 生成PDF文件...')
		const pdfBuffer = await page.pdf({
			path: pdfPath,
			format: 'A4',
			printBackground: true
		})

		await browser.close()

		const endTime = new Date()
		const duration = Math.round((endTime - startTime) / 1000)

		console.log('\n✅ PDF生成完成!')
		console.log('='.repeat(50))
		console.log(`📄 文件名: ${cleanFilename}.pdf`)
		console.log(`📁 保存路径: ${pdfPath}`)
		console.log(`📊 文件大小: ${(pdfBuffer.length / 1024).toFixed(1)} KB`)
		console.log(`⏱️ 生成耗时: ${duration}秒`)
		console.log(`🎉 测试完成!`)
	} catch (error) {
		console.error('\n❌ PDF生成失败:', error.message)
		console.error('详细错误:', error)
		process.exit(1)
	}
}

generateSinglePDF()
