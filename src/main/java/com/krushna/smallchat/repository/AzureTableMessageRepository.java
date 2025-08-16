package com.krushna.smallchat.repository;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import com.azure.data.tables.TableClient;
import com.azure.data.tables.TableClientBuilder;
import com.azure.data.tables.models.ListEntitiesOptions;
import com.azure.data.tables.models.TableEntity;
import com.azure.data.tables.models.TableServiceException;
import com.krushna.smallchat.model.ChatMessage;

@Repository
public class AzureTableMessageRepository implements MessageRepository {

    private static final Logger log = LoggerFactory.getLogger(AzureTableMessageRepository.class);

    private final String partitionKey;
    private final boolean enabled;
    private final TableClient tableClient;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withLocale(Locale.ROOT);

    public AzureTableMessageRepository(
            @Value("${smallchat.azure.table.connection-string:}") String connectionString,
            @Value("${smallchat.azure.table.name:SmallChatMessages}") String tableName,
            @Value("${smallchat.azure.table.partition:default}") String partitionKey
    ) {
        this.partitionKey = partitionKey;
        if (connectionString == null || connectionString.isBlank()) {
            this.enabled = false;
            this.tableClient = null;
            log.info("Azure Table Storage disabled: no connection string provided");
        } else {
            this.tableClient = new TableClientBuilder()
                    .connectionString(connectionString)
                    .tableName(tableName)
                    .buildClient();
            this.enabled = true;
            log.info("Azure Table Storage enabled. Table: {} Partition: {}", tableName, partitionKey);
        }
    }

    @Override
    public void save(ChatMessage message) throws Exception {
        if (!enabled) return;
        TableEntity entity = toEntity(message);
        tableClient.upsertEntity(entity);
    }

    @Override
    public List<ChatMessage> loadSince(LocalDateTime since) throws Exception {
        List<ChatMessage> list = new ArrayList<>();
        if (!enabled) return list;
        long cutoff = toEpochMillisUtc(since);
        // Append 'L' to indicate Int64 in OData filter
        String filter = String.format("PartitionKey eq '%s' and tsEpoch ge %dL", partitionKey, cutoff);
        for (TableEntity e : tableClient.listEntities(new ListEntitiesOptions().setFilter(filter), null, null)) {
            ChatMessage msg = fromEntity(e);
            if (msg != null) list.add(msg);
        }
        return list;
    }

    @Override
    public int deleteBefore(LocalDateTime cutoffTime) throws Exception {
        if (!enabled) return 0;
        int deleted = 0;
        long cutoff = toEpochMillisUtc(cutoffTime);
        // Append 'L' to indicate Int64 in OData filter
        String filter = String.format("PartitionKey eq '%s' and tsEpoch lt %dL", partitionKey, cutoff);
        for (TableEntity e : tableClient.listEntities(new ListEntitiesOptions().setFilter(filter), null, null)) {
            try {
                tableClient.deleteEntity(Objects.toString(e.getPartitionKey()), Objects.toString(e.getRowKey()));
                deleted++;
            } catch (TableServiceException ex) {
                log.warn("Failed deleting entity {}: {}", e.getRowKey(), ex.getMessage());
            }
        }
        return deleted;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    private TableEntity toEntity(ChatMessage m) {
        long epoch = toEpochMillisUtc(m.getTimestamp());
        String rowKey = String.format("%013d_%s", epoch, m.getId());
        TableEntity e = new TableEntity(partitionKey, rowKey);
        e.addProperty("id", m.getId());
        e.addProperty("sender", m.getSender());
        e.addProperty("content", m.getContent());
        e.addProperty("type", m.getType() != null ? m.getType().name() : null);
        e.addProperty("timestampIso", m.getTimestamp() != null ? m.getTimestamp().format(ISO) : null);
        e.addProperty("tsEpoch", epoch);
        return e;
    }

    private ChatMessage fromEntity(TableEntity e) {
        try {
            ChatMessage m = new ChatMessage();
            Object id = e.getProperty("id");
            if (id != null) m.setId(id.toString());
            Object sender = e.getProperty("sender");
            if (sender != null) m.setSender(sender.toString());
            Object content = e.getProperty("content");
            if (content != null) m.setContent(content.toString());
            Object type = e.getProperty("type");
            if (type != null) m.setType(ChatMessage.MessageType.valueOf(type.toString()));
            Object tsIso = e.getProperty("timestampIso");
            if (tsIso != null) {
                m.setTimestamp(LocalDateTime.parse(tsIso.toString(), ISO));
            } else {
                Object tsEpoch = e.getProperty("tsEpoch");
                if (tsEpoch instanceof Number) {
                    m.setTimestamp(LocalDateTime.ofEpochSecond(((Number) tsEpoch).longValue() / 1000, 0, ZoneOffset.UTC));
                }
            }
            return m;
        } catch (Exception ex) {
            log.warn("Failed to parse entity {}: {}", e.getRowKey(), ex.getMessage());
            return null;
        }
    }

    private static long toEpochMillisUtc(LocalDateTime ldt) {
        if (ldt == null) ldt = LocalDateTime.now();
        return ldt.toInstant(ZoneOffset.UTC).toEpochMilli();
    }
}
