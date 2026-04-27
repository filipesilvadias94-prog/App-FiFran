# FI FRAN V3 Definitiva

App online do casal com Supabase.

## Como publicar
1. Substitua os arquivos do GitHub por estes arquivos.
2. Faça commit.
3. A Vercel fará redeploy automático.

## Tabelas usadas
- public.foods
- public.history

## Observação importante
Este app usa as colunas `date` e `plan_json` na tabela `history`.
Se ainda não existirem, rode no Supabase:

```sql
alter table public.history add column if not exists date text;
alter table public.history add column if not exists plan_json text;
```
