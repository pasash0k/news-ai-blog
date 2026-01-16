// script.js

const NEWS_API_KEY = '9c7a56a979b445d2b9f4e923d6afc53e';
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE';   // ← сюди свій ключ від OpenAI / Grok API / інший LLM

const NEWS_API_BASE = 'https://newsapi.org/v2/top-headlines';
const DEFAULT_PARAMS = {
  country: 'ua',
  language: 'uk',
  pageSize: 15,
  apiKey: NEWS_API_KEY
};

document.getElementById('load-news').addEventListener('click', loadNews);

async function loadNews() {
  const category = document.getElementById('category').value;
  
  const params = new URLSearchParams({
    ...DEFAULT_PARAMS,
    category: category
  });

  const url = `${NEWS_API_BASE}?${params}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`NewsAPI помилка: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'ok') {
      throw new Error(data.message || 'Невідома помилка від NewsAPI');
    }

    displayNews(data.articles);

  } catch (error) {
    console.error('Помилка завантаження новин:', error);
    document.getElementById('news-container').innerHTML = `
      <div style="color: #e74c3c; text-align: center; padding: 2rem;">
        <h3>Не вдалося завантажити новини</h3>
        <p>${error.message}</p>
        <small>Перевірте ліміт запитів або валідність ключа</small>
      </div>
    `;
  }
}

function displayNews(articles) {
  const container = document.getElementById('news-container');
  container.innerHTML = '';

  if (articles.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding:3rem;">Немає новин за обраною категорією на даний момент...</p>';
    return;
  }

  articles.forEach(article => {
    const content = article.content || article.description || '';
    const shortContent = content.length > 300 ? content.slice(0, 300) + '...' : content;

    const div = document.createElement('div');
    div.classList.add('article');
    div.innerHTML = `
      ${article.urlToImage ? `<img src="${article.urlToImage}" alt="${article.title}" loading="lazy">` : ''}
      <h3>${article.title || 'Без заголовка'}</h3>
      <p class="source">${article.source?.name || '?'} • ${formatDate(article.publishedAt)}</p>
      <p>${shortContent}</p>
      <button onclick="generateSummary('${encodeURIComponent(content)}', '${encodeURIComponent(article.title)}')">
        Згенерувати AI-резюме
      </button>
    `;
    container.appendChild(div);
  });
}

async function generateSummary(encodedContent, encodedTitle) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
    alert('Вставте свій OpenAI (або сумісний) API-ключ у змінну OPENAI_API_KEY');
    return;
  }

  const modal = document.getElementById('summary-modal');
  const summaryText = document.getElementById('summary-text');
  
  summaryText.innerHTML = 'Генеруємо резюме за допомогою ШІ...';
  modal.style.display = 'block';

  try {
    const content = decodeURIComponent(encodedContent);
    const title = decodeURIComponent(encodedTitle);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Ти створюєш дуже короткі, чіткі та інформативні резюме українською мовою (максимум 4-6 речень).'
          },
          {
            role: 'user',
            content: `Заголовок: ${title}\n\nТекст:\n${content}\n\nЗроби дуже стисле резюме українською`
          }
        ],
        temperature: 0.7,
        max_tokens: 180
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API помилка: ${response.status}`);
    }

    const data = await response.json();
    summaryText.innerHTML = data.choices?.[0]?.message?.content?.replace(/\n/g, '<br>') 
      || 'Не вдалося отримати відповідь від моделі';

  } catch (err) {
    console.error(err);
    summaryText.innerHTML = `Помилка генерації резюме:<br><br>${err.message}`;
  }
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('uk-UA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Закриття модального вікна
document.querySelector('.close').onclick = () => {
  document.getElementById('summary-modal').style.display = 'none';
};

window.onclick = (event) => {
  const modal = document.getElementById('summary-modal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
};