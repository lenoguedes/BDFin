import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables.
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini API.
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured in secrets.");
    }
    ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

// Map of standard categories and default values for "create_month" action
const STANDARD_CATEGORIES = [
  { subcategory: "Aluguel / Condomínio", category: "Habitacao & Familia", value: 1200.00, type: "Fixo", sqlTable: "Fluxo_Casa", description: "Custo mensal de moradia (exemplo)." },
  { subcategory: "Energia & Água", category: "Habitacao & Familia", value: 180.00, type: "Fixo", sqlTable: "Categoria_Despesas", description: "Contas de consumo da casa (exemplo)." },
  { subcategory: "Supermercado & Feira", category: "Estilo de Vida", value: 750.00, type: "Variável", sqlTable: "Categoria_Despesas", description: "Alimentação do mês (exemplo)." },
  { subcategory: "Internet & Celular", category: "Telecomunicacoes", value: 120.00, type: "Fixo", sqlTable: "Categoria_Despesas", description: "Internet residencial e plano de celular (exemplo)." },
  { subcategory: "Transporte & Combustível", category: "Transporte", value: 250.00, type: "Variável", sqlTable: "Categoria_Despesas", description: "Deslocamento mensal (exemplo)." },
  { subcategory: "Academia & Bem-Estar", category: "Saude & Bem-Estar", value: 110.00, type: "Fixo", sqlTable: "Categoria_Despesas", description: "Mensalidade de atividade física (exemplo)." },
  { subcategory: "Plano de Saúde / Farmácia", category: "Saude & Bem-Estar", value: 150.00, type: "Fixo", sqlTable: "Categoria_Despesas", description: "Saúde e medicamentos (exemplo)." },
  { subcategory: "Educação & Cursos", category: "Obrigacoes & Negocios", value: 200.00, type: "Fixo", sqlTable: "Categoria_Despesas", description: "Cursos e capacitação (exemplo)." },
  { subcategory: "Lazer & Entretenimento", category: "Estilo de Vida", value: 200.00, type: "Variável", sqlTable: "Categoria_Despesas", description: "Lazer do mês (exemplo)." },
  { subcategory: "Reserva & Investimentos", category: "Financas & Credito", value: 300.00, type: "Fixo", sqlTable: "Categoria_Despesas", description: "Aporte mensal na reserva (exemplo)." },
  { subcategory: "Cartão de Crédito", category: "Financas & Credito", value: 0.00, type: "Variável", sqlTable: "Categoria_Despesas", description: "Gasto consolidado no cartão." }
];

// Heuristic fallback command processor if Gemini is unavailable
function fallbackHeuristics(prompt: string, currentMonthYear: string, transactions: any[]): any {
  const norm = prompt.toLowerCase();
  
  // Create month command
  if (norm.includes("gerar") || norm.includes("gere") || norm.includes("competencia") || norm.includes("competência")) {
    let target = currentMonthYear;
    const months = ["janeiro", "fevereiro", "março", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    for (const m of months) {
      if (norm.includes(m)) {
        // extract year if exists, default to 2026
        const yearMatch = norm.match(/\b(202\d)\b/);
        const year = yearMatch ? yearMatch[1] : "2026";
        const cleanMonth = m.charAt(0).toUpperCase() + m.slice(1).replace("ç", "c");
        target = `${cleanMonth} ${year}`;
        break;
      }
    }

    const generated = STANDARD_CATEGORIES.map((cat, i) => ({
      id: `fallback-${Date.now()}-${i}`,
      date: new Date().toISOString().split('T')[0],
      category: cat.category,
      subcategory: cat.subcategory,
      value: cat.value,
      status: "Previsto" as const,
      type: cat.type as any,
      sqlTable: cat.sqlTable as any,
      description: cat.description
    }));

    return {
      updatedTransactions: generated,
      message: `[Fallback] Sucesso! Mês de ${target} gerado automaticamente com os valores padrão previstos.`,
      actionPerformed: "create_month",
      targetMonthYear: target
    };
  }

  // Edit / Exception command
  const updated = [...transactions];
  let matchedCount = 0;
  let summaryParts: string[] = [];

  // Energia / Água
  if (norm.includes("energia") || norm.includes("luz") || norm.includes("agua") || norm.includes("água")) {
    const idx = updated.findIndex(t => t.subcategory.toLowerCase().includes("energia"));
    if (idx !== -1) {
      updated[idx].status = "OK";
      matchedCount++;
      summaryParts.push("Energia & Água para status 'OK'");
    }
  }

  // Educação / Curso
  if (norm.includes("curso") || norm.includes("educacao") || norm.includes("educação")) {
    const idx = updated.findIndex(t => t.subcategory.toLowerCase().includes("educa"));
    if (idx !== -1) {
      updated[idx].status = "OK";
      // check if a new value was specified, e.g. "curso deu 250"
      const matchValue = norm.match(/(?:curso|educacao|educação)\s+(?:deu|fechou|de|em)?\s*(?:r\$)?\s*(\d+(?:[.,]\d+)?)/);
      if (matchValue) {
        const val = parseFloat(matchValue[1].replace(",", "."));
        updated[idx].value = val;
        summaryParts.push(`Educação atualizada para R$ ${val.toFixed(2)} e paga`);
      } else {
        summaryParts.push("Educação marcada como paga");
      }
      matchedCount++;
    }
  }

  // Casa / Aluguel
  if (norm.includes("casa") || norm.includes("aluguel")) {
    const idx = updated.findIndex(t => t.subcategory.toLowerCase().includes("aluguel"));
    if (idx !== -1) {
      updated[idx].status = "OK";
      matchedCount++;
      summaryParts.push("Moradia paga");
    }
  }

  // Comida / Alimentação
  if (norm.includes("comida") || norm.includes("mercado") || norm.includes("alimentacao") || norm.includes("alimentação")) {
    const idx = updated.findIndex(t => t.subcategory.toLowerCase().includes("supermercado"));
    if (idx !== -1) {
      const matchValue = norm.match(/(?:comida|alimentação|alimentacao|mercado)\s+(?:deu|fechou|de|em)?\s*(?:r\$)?\s*(\d+(?:[.,]\d+)?)/);
      if (matchValue) {
        const val = parseFloat(matchValue[1].replace(",", "."));
        updated[idx].value = val;
        updated[idx].status = "OK";
        summaryParts.push(`Alimentação ajustada para R$ ${val.toFixed(2)} e marcada como paga`);
      } else {
        updated[idx].status = "OK";
        summaryParts.push("Alimentação confirmada");
      }
      matchedCount++;
    }
  }

  // Internet / Celular
  if (norm.includes("internet") || norm.includes("celular") || norm.includes("telefone")) {
    const idx = updated.findIndex(t => t.subcategory.toLowerCase().includes("celular") || t.subcategory.toLowerCase().includes("internet"));
    if (idx !== -1) {
      updated[idx].status = "OK";
      matchedCount++;
      summaryParts.push("Internet/Celular marcado como OK");
    }
  }

  // Add guest expense
  if (norm.includes("inclui") || norm.includes("inclua") || norm.includes("adiciona") || norm.includes("adicionar") || norm.includes("gasto pontual") || norm.includes("extra")) {
    // try to match value
    const valMatch = norm.match(/(?:gasto|adiciona|r\$)\s*(\d+(?:[.,]\d+)?)/);
    const value = valMatch ? parseFloat(valMatch[1].replace(",", ".")) : 100.00;
    
    // try to match description
    let desc = "Gasto Extra Pontual";
    if (norm.includes("bike") || norm.includes("manutenção") || norm.includes("manutencao")) {
      desc = "Manutenção da Bike";
    } else if (norm.includes("academia")) {
      desc = "Esporte Extra";
    }

    const extraTrans = {
      id: `extra-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      category: "Estilo de Vida",
      subcategory: "Gasto Extra / Manutenção",
      value: value,
      status: "OK" as const,
      type: "Variável" as const,
      sqlTable: "Categoria_Despesas" as const,
      description: desc
    };
    updated.push(extraTrans);
    return {
      updatedTransactions: updated,
      message: `[Fallback] Sucesso! Adicionado gasto pontual extra de R$ ${value.toFixed(2)} com "${desc}" diretamente na tabela.`,
      actionPerformed: "add_transaction",
      targetMonthYear: currentMonthYear
    };
  }

  if (matchedCount > 0) {
    return {
      updatedTransactions: updated,
      message: `[Fallback] Operação realizada com sucesso! Atualizações aplicadas: ${summaryParts.join(", ")}.`,
      actionPerformed: "update",
      targetMonthYear: currentMonthYear
    };
  }

  // Add the command as an unknown statement but confirm receipt
  return {
    updatedTransactions: transactions,
    message: "[Fallback] Não consegui determinar a ação específica automaticamente. Tente usar palavras como 'Paguei a energia', 'Gere a competência de Junho/2026', ou 'Mercado deu 780'.",
    actionPerformed: "no_change",
    targetMonthYear: currentMonthYear
  };
}

// REST route to process command with Gemini LLM
app.post("/api/process-command", async (req, res) => {
  const { prompt, transactions, currentMonthYear } = req.body;

  if (!prompt) {
    res.status(400).json({ error: "O texto do comando é obrigatório." });
    return;
  }

  try {
    const aiClient = getGeminiClient();

    const systemInstruction = `
      Você é o "FinOps Engine v2", uma plataforma inteligente de gestão e Engenharia de Dados Financeiros Pessoais com foco em PREVISIBILIDADE.
      Você analisa comandos em linguagem natural em português de um Engenheiro de Dados e atualiza a lista de transações mensais.
      
      Lista de Categorias e Subcategorias com Valores Padrão:
      ${JSON.stringify(STANDARD_CATEGORIES, null, 2)}

      Regras de Operação:
      1. COMANDO "GERAR MÊS / COMPETÊNCIA": Se o usuário pedir para gerar um mês (Ex: "Gere a competência de Junho de 2026" ou "Gerar competência Junho/2026"), defina "actionPerformed" como "create_month" e "targetMonthYear" para o mês no formato "NomeMes Ano" (ex: "Junho 2026"). Preencha "updatedTransactions" com a lista integral de todas as 11 subcategorias padrão com cada status como "Previsto".
      2. ATUALIZAÇÃO POR EXCEÇÃO (Mudar Status ou Valor):
         Se o usuário disser "Paguei a energia" ou "Confirma o curso" ou "Confirma o aluguel", encontre a transação correspondente no array fornecido, altere o status de "Previsto" para "OK".
         Se ele disser "Mercado deu R$ 780" ou "atualiza o mercado que ficou em 780", altere o valor de "Supermercado & Feira" correspondente de 750.00 para 780.00 e mude o status para "OK".
         Se houver múltiplas confirmações (ex: "Paguei energia e internet"), aplique todas.
      3. GASTOS EXTRAS / PONTUAIS: Se o usuário pedir para incluir um gasto pontual (ex: "Inclui um gasto extra de R$ 150 com manutenção da bike hoje"), crie uma nova transação com categoria adequada (ex: "Estilo de Vida" ou "Obrigacoes"), insira "status": "OK", defina o valor correto, type: "Variável", sqlTable: "Categoria_Despesas", coloque a descrição útil ("Manutenção da Bike") e adicione-a no fim do array "updatedTransactions".
      
      Retorne SEMPRE a lista de transações RECONSTRUÍDA com os estados atualizados de acordo com o pedido do usuário, junto com uma mensagem explicativa bem amigável em português justificando as alterações.
    `;

    const userPrompt = `
      Comando do usuário: "${prompt}"
      Mês Atual: "${currentMonthYear}"
      Transações Atuais do Mês: ${JSON.stringify(transactions, null, 2)}
    `;

    const schema = {
      type: Type.OBJECT,
      properties: {
        updatedTransactions: {
          type: Type.ARRAY,
          description: "Lista de transações atualizada pelo prompt",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              date: { type: Type.STRING },
              category: { type: Type.STRING },
              subcategory: { type: Type.STRING },
              value: { type: Type.NUMBER },
              status: { type: Type.STRING },
              type: { type: Type.STRING },
              sqlTable: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["id", "date", "category", "subcategory", "value", "status", "type", "sqlTable", "description"]
          }
        },
        message: {
          type: Type.STRING,
          description: "Mensagem amigável de confirmação detalhada em português descrevendo as ações executadas."
        },
        actionPerformed: {
          type: Type.STRING,
          description: "Ação identificada: 'create_month' | 'update' | 'add_transaction' | 'no_change'"
        },
        targetMonthYear: {
          type: Type.STRING,
          description: "Mês/Ano alvo identificado (ex: 'Junho 2026')"
        }
      },
      required: ["updatedTransactions", "message", "actionPerformed", "targetMonthYear"]
    };

    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1
      }
    });

    const bodyText = response.text || "{}";
    const result = JSON.parse(bodyText.trim());
    res.json(result);

  } catch (error: any) {
    console.warn("Gemini Engine API Error, fallback to local heuristic engine:", error.message);
    // Graceful fallback to heuristic local parsing to ensure perfect applet UX
    const result = fallbackHeuristics(prompt, currentMonthYear, transactions);
    res.json(result);
  }
});

app.get("/api/env-keys", (req, res) => {
  const keys = Object.keys(process.env).filter(
    k => k.includes("GOOGLE") || k.includes("OAUTH") || k.includes("CLIENT") || k.includes("FIREBASE") || k.includes("APP_URL") || k.includes("PORT")
  );
  res.json({ keys });
});

// Setup Vite & static assets rendering pipeline
async function configureServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FinOps Engine full-stack server listening on http://0.0.0.0:${PORT}`);
  });
}

configureServer();
