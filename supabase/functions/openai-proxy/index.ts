import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Falta el token de autenticación.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('SUPABASE_URL or SUPABASE_ANON_KEY is missing');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const apikeyHeader = req.headers.get('apikey') ?? '';
    const allowAnonymous = Deno.env.get('OPENAI_PROXY_ALLOW_ANON') === 'true';
    const knownKeys = [supabaseAnonKey, Deno.env.get('SUPABASE_PUBLISHABLE_KEY')].filter(
      (key): key is string => typeof key === 'string' && key.length > 0,
    );
    const callerKey = knownKeys.find((key) => key === token || key === apikeyHeader) ?? null;
    if (!callerKey) {
      return new Response(
        JSON.stringify({ error: 'Falta una llave de proyecto válida.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!allowAnonymous) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Acceso anónimo no habilitado. Revisa el despliegue y el secret OPENAI_PROXY_ALLOW_ANON.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY secret is not configured');
    }

    const body = await req.json() as {
      action: 'scanReceipt' | 'breakdownTask' | 'analyzeFinances';
      payload: Record<string, unknown>;
    };

    if (!body.action || !body.payload) {
      return new Response(
        JSON.stringify({ error: 'Petición inválida.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let messages: Array<{ role: string; content: unknown }>;
    let responseFormat: Record<string, unknown>;

    if (body.action === 'scanReceipt') {
      const { base64Image } = body.payload as { base64Image?: string };
      if (!base64Image || base64Image.length < 100) {
        return new Response(
          JSON.stringify({ error: 'La imagen del recibo no es válida.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      messages = [
        {
          role: 'system',
          content:
            'Eres un extractor de datos de recibos. Devuelves únicamente JSON válido conforme al esquema solicitado.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Lee el recibo en la imagen y extrae: comercio (merchant), importe total, moneda, fecha de compra (formato ISO 8601), nombre de categoría sugerido y líneas del ticket (descripción, cantidad, precio unitario y total). Si algún dato no es legible, devuelve null o un valor conservador.',
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
          ],
        },
      ];
      responseFormat = {
        type: 'json_schema',
        json_schema: {
          name: 'receipt_scan',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              merchant: { type: 'string' },
              total: { type: 'number' },
              currency: { type: 'string' },
              purchasedAt: { type: ['string', 'null'] },
              categoryName: { type: ['string', 'null'] },
              confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    description: { type: 'string' },
                    quantity: { type: 'number' },
                    unitPrice: { type: 'number' },
                    total: { type: 'number' },
                  },
                  required: ['description', 'quantity', 'unitPrice', 'total'],
                },
              },
            },
            required: ['merchant', 'total', 'currency', 'purchasedAt', 'categoryName', 'confidence', 'items'],
          },
        },
      };
    } else if (body.action === 'breakdownTask') {
      const { title, description } = body.payload as { title?: string; description?: string };
      if (!title || title.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'Escribe un título para desglosar la tarea.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const maxItems = 12;
      const prompt =
        `Desglosa la siguiente tarea en pasos accionables. Máximo ${maxItems} pasos.\n` +
        `Título: ${title}\n` +
        (description ? `Descripción: ${description}\n` : '') +
        'Cada paso debe tener un título breve y una estimación realista en minutos.';
      messages = [
        {
          role: 'system',
          content:
            'Eres un planificador de tareas. Devuelves únicamente JSON válido conforme al esquema solicitado.',
        },
        { role: 'user', content: prompt },
      ];
      responseFormat = {
        type: 'json_schema',
        json_schema: {
          name: 'task_breakdown',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              subtasks: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    title: { type: 'string' },
                    estimatedMinutes: { type: 'number' },
                  },
                  required: ['title', 'estimatedMinutes'],
                },
              },
            },
            required: ['subtasks'],
          },
        },
      };
    } else if (body.action === 'analyzeFinances') {
      const summary = body.payload as { summaryText?: string };
      if (!summary.summaryText || summary.summaryText.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'No hay datos financieros para analizar.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      messages = [
        {
          role: 'system',
          content:
            'Eres el gestor financiero de una empresa mundial, preciso y profesional, hablando español claro y directo. Analizas resúmenes de finanzas personales y devuelves únicamente JSON válido conforme al esquema solicitado. Sin rodeos: diagnóstico, riesgos y acciones concretas con cifras.',
        },
        {
          role: 'user',
          content:
            'Analiza estas finanzas personales del mes en curso y su tendencia reciente:\n' +
            summary.summaryText.slice(0, 6000),
        },
      ];
      responseFormat = {
        type: 'json_schema',
        json_schema: {
          name: 'finance_analysis',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              healthScore: { type: 'number' },
              verdict: { type: 'string' },
              insights: {
                type: 'array',
                items: { type: 'string' },
              },
              actions: {
                type: 'array',
                items: { type: 'string' },
              },
              suggestedBudgets: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    category: { type: 'string' },
                    amount: { type: 'number' },
                  },
                  required: ['category', 'amount'],
                },
              },
            },
            required: ['healthScore', 'verdict', 'insights', 'actions', 'suggestedBudgets'],
          },
        },
      };
    } else {
      return new Response(
        JSON.stringify({ error: `Acción desconocida: ${body.action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: body.action === 'scanReceipt' ? 2000 : body.action === 'analyzeFinances' ? 1500 : 1200,
        messages,
        response_format: responseFormat,
      }),
    });

    if (!completion.ok) {
      const errText = await completion.text();
      console.error('OpenAI API error:', completion.status, errText);
      throw new Error(`Error de la API de OpenAI (${completion.status}).`);
    }

    const data = await completion.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('La API no devolvió contenido.');
    }

    return new Response(
      JSON.stringify({ result: JSON.parse(content) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('openai-proxy error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
