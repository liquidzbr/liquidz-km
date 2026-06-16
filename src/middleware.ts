import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { emailAutorizado } from "@/lib/acesso";

// Encerra a sessão Supabase removendo os cookies de auth da resposta de redirect.
function bloquear(request: NextRequest, motivo: string) {
  const redirect = NextResponse.redirect(new URL(`/?erro=${motivo}`, request.url));
  request.cookies.getAll().forEach((c) => {
    if (c.name.startsWith("sb-")) redirect.cookies.delete(c.name);
  });
  return redirect;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const rotaProtegida = request.nextUrl.pathname.startsWith("/rep") ||
                        request.nextUrl.pathname.startsWith("/rh");

  if (rotaProtegida) {
    // Sem sessão → manda pro login
    if (!user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    // Com sessão mas fora da lista de autorizados → bloqueia e encerra a sessão.
    // Vale para qualquer email, inclusive @liquidz.com.br que não esteja cadastrado.
    if (!emailAutorizado(user.email)) {
      return bloquear(request, "nao_cadastrado");
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
