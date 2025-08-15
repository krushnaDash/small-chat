package com.krushna.smallchat.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class LoginController {

    @Value("${app.password:}")
    private String appPassword;

    private static final String AUTH_ATTR = "AUTH";

    @GetMapping("/login")
    public String loginPage(@RequestParam(value = "redirect", required = false) String redirect,
                            HttpSession session,
                            Model model) {
        if (Boolean.TRUE.equals(session.getAttribute(AUTH_ATTR))) {
            // Already logged in; redirect to target or home
            return "redirect:" + (StringUtils.hasText(redirect) ? redirect : "/");
        }
        model.addAttribute("redirect", redirect);
        model.addAttribute("hasPassword", StringUtils.hasText(appPassword));
        return "login";
    }

    @PostMapping("/login")
    public String doLogin(@RequestParam("password") String password,
                          @RequestParam(value = "redirect", required = false) String redirect,
                          HttpServletRequest request) {
        // If no password configured, deny login to avoid accidental open access
        if (!StringUtils.hasText(appPassword)) {
            return "redirect:/login?error=nopass" + (StringUtils.hasText(redirect) ? "&redirect=" + redirect : "");
        }
        if (appPassword.equals(password)) {
            request.getSession(true).setAttribute(AUTH_ATTR, true);
            return "redirect:" + (StringUtils.hasText(redirect) ? redirect : "/");
        }
        return "redirect:/login?error=1" + (StringUtils.hasText(redirect) ? "&redirect=" + redirect : "");
    }

    @PostMapping("/logout")
    public String doLogout(HttpServletRequest request,
                           @RequestParam(value = "redirect", required = false) String redirect) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return "redirect:/login" + (StringUtils.hasText(redirect) ? "?redirect=" + redirect : "");
    }
}
