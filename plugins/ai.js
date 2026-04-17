import { OpenAI } from 'openai'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `*يرجى إدخال نص للبحث عنه*\n\n*مثال: ${usedPrefix + command} كيف حالك؟*`
    
    await conn.sendMessage(m.chat, { react: { text: '🤖', key: m.key } })
    
    try {
        const client = new OpenAI()
        const response = await client.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
                { role: "system", content: "أنت مساعد ذكي يدعى زيريف (Zeref). أنت ودود ومفيد وتتحدث باللغة العربية." },
                { role: "user", content: text }
            ]
        })
        
        let result = response.choices[0].message.content
        m.reply(result)
        
    } catch (e) {
        console.error(e)
        throw '*حدث خطأ أثناء معالجة طلبك. يرجى المحاولة لاحقاً.*'
    }
}

handler.help = ['ai']
handler.tags = ['tools']
handler.command = /^(ai|بوت|زيريف)$/i

export default handler
