package com.securepm.projects;

import java.util.List;

public class PageResponse<T> {

    public List<T> items;
    public long total;
    public int page;
    public int size;
    public int totalPages;

    public PageResponse() {
    }

    public PageResponse(List<T> items, long total, int page, int size, int totalPages) {
        this.items = items;
        this.total = total;
        this.page = page;
        this.size = size;
        this.totalPages = totalPages;
    }
}