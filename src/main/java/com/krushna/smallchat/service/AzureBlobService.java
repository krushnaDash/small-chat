package com.krushna.smallchat.service;

import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobClientBuilder;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobContainerClientBuilder;
import com.azure.storage.blob.models.BlobItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class AzureBlobService {
    private static final Logger log = LoggerFactory.getLogger(AzureBlobService.class);

    private final boolean enabled;
    private final BlobContainerClient containerClient;

    public AzureBlobService(
            @Value("${smallchat.azure.blob.connection-string:${smallchat.azure.table.connection-string:}}") String connectionString,
            @Value("${smallchat.azure.blob.container:smallchatmedia}") String container
    ) {
        if (connectionString == null || connectionString.isBlank()) {
            this.enabled = false;
            this.containerClient = null;
            log.info("Azure Blob Storage disabled: no connection string provided");
        } else {
            this.containerClient = new BlobContainerClientBuilder()
                    .connectionString(connectionString)
                    .containerName(container)
                    .buildClient();
            this.enabled = true;
            log.info("Azure Blob Storage enabled. Container: {}", container);
        }
    }

    public boolean isEnabled() { return enabled; }

    public static class MediaItem {
        public String name;
        public String url;
        public Long size;
        public String contentType;
        public OffsetDateTime lastModified;
    }

    public MediaItem upload(MultipartFile file) throws Exception {
        if (!enabled) throw new IllegalStateException("Blob storage disabled");
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Empty file");
        // allow images and videos
        String ct = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
        if (!(ct.startsWith("image/") || ct.startsWith("video/"))) {
            throw new IllegalArgumentException("Only image/* or video/* files are allowed");
        }
        String ext = safeExt(file.getOriginalFilename());
        String blobName = UUID.randomUUID().toString() + (ext.isEmpty() ? "" : ("." + ext));
        // Important: use the authenticated container client to obtain a BlobClient.
        // Building a new BlobClient with just an endpoint would miss credentials and cause 401.
        BlobClient blobClient = containerClient.getBlobClient(blobName);
        try (InputStream in = file.getInputStream()) {
            blobClient.upload(in, file.getSize());
            blobClient.setHttpHeaders(new com.azure.storage.blob.models.BlobHttpHeaders().setContentType(ct));
        }
        MediaItem item = new MediaItem();
        item.name = blobName;
        item.url = blobClient.getBlobUrl();
        item.size = file.getSize();
        item.contentType = ct;
        item.lastModified = OffsetDateTime.now();
        return item;
    }

    public List<MediaItem> list() {
        List<MediaItem> list = new ArrayList<>();
        if (!enabled) return list;
        for (BlobItem bi : containerClient.listBlobs()) {
            BlobClient bc = containerClient.getBlobClient(bi.getName());
            MediaItem mi = new MediaItem();
            mi.name = bi.getName();
            mi.url = bc.getBlobUrl();
            mi.size = (bi.getProperties() != null && bi.getProperties().getContentLength() != null) ? bi.getProperties().getContentLength() : null;
            mi.contentType = bi.getProperties() != null ? bi.getProperties().getContentType() : null;
            mi.lastModified = bi.getProperties() != null ? bi.getProperties().getLastModified() : null;
            list.add(mi);
        }
        return list;
    }

    private static String safeExt(String name) {
        if (name == null) return "";
        int i = name.lastIndexOf('.');
        if (i < 0) return "";
        String ext = name.substring(i + 1).toLowerCase();
        return ext.replaceAll("[^a-z0-9]", "");
    }
}
