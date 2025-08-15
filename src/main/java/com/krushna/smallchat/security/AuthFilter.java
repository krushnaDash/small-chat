package com.krushna.smallchat.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(1)
public class AuthFilter extends OncePerRequestFilter {

    private static final String AUTH_ATTR = "AUTH";
    private static final AntPathMatcher matcher = new AntPathMatcher();

    private boolean isExcluded(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Allow login endpoints and health
        if (path.equals("/login") || path.equals("/api/health")) return true;
        // Allow static assets and common public paths
        String[] patterns = new String[]{
                "/css/**", "/js/**", "/images/**", "/favicon.*", "/webjars/**", "/uploads/**", "/ws/**"
        };
        for (String p : patterns) {
            if (matcher.match(p, path)) return true;
        }
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (isExcluded(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        HttpSession session = request.getSession(false);
        boolean authed = session != null && Boolean.TRUE.equals(session.getAttribute(AUTH_ATTR));
        if (authed) {
            filterChain.doFilter(request, response);
            return;
        }
        String target = request.getRequestURI();
        String qs = request.getQueryString();
        if (StringUtils.hasText(qs)) target += "?" + qs;
        response.sendRedirect("/login?redirect=" + urlEncode(target));
    }

    private String urlEncode(String v) {
        try {
            return java.net.URLEncoder.encode(v, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            return v;
        }
    }
}
