package com.krushna.smallchat.controller;

import com.krushna.smallchat.service.AzureBlobService;
import com.krushna.smallchat.service.AzureBlobService.MediaItem;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Controller
@RequestMapping("/media")
public class MediaController {

    private final AzureBlobService blobService;

    public MediaController(AzureBlobService blobService) {
        this.blobService = blobService;
    }

    @GetMapping
    public String page(Model model) {
        List<MediaItem> items = blobService.list();
        model.addAttribute("enabled", blobService.isEnabled());
        model.addAttribute("items", items);
        return "media";
    }

    @PostMapping("/upload")
    public String upload(@RequestParam("file") MultipartFile file, Model model) throws Exception {
        if (!blobService.isEnabled()) {
            model.addAttribute("enabled", false);
            model.addAttribute("error", "Blob storage not configured");
            model.addAttribute("items", List.of());
            return "media";
        }
        blobService.upload(file);
        return "redirect:/media";
    }
}
