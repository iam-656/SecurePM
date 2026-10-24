package com.securepm.projects;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "subproject_dependencies",
       uniqueConstraints = @UniqueConstraint(columnNames = {"subproject_id", "prerequisite_id"}))
@SequenceGenerator(name = "subproject_dependencies_id_seq", sequenceName = "subproject_dependencies_id_seq", allocationSize = 1)
public class SubprojectDependency extends PanacheEntity {

    @Column(name = "subproject_id", nullable = false)
    public Long subprojectId;

    @Column(name = "prerequisite_id", nullable = false)
    public Long prerequisiteId;

    @Column(name = "created_at")
    public LocalDateTime createdAt;

    @PrePersist
    void onPersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
